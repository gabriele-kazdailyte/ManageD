using ManageD.Api.Common;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using ManageD.Api.Services;

namespace ManageD.Api.Tests;

public class DeltaApplierTests
{
    private static Asset AssetWith(params TodoItem[] items)
    {
        var asset = new Asset { Id = Guid.NewGuid(), Items = items.ToList() };
        foreach (var item in items)
        {
            item.AssetId = asset.Id;
        }

        return asset;
    }

    private static TodoItem Item(string text, int order = 0) =>
        new() { Id = Guid.NewGuid(), Text = text, Order = order };

    [Fact]
    public void Two_additions_both_survive()
    {
        var asset = AssetWith();
        var first = new TodoItemDto(Guid.NewGuid(), "a", false, 0);
        var second = new TodoItemDto(Guid.NewGuid(), "b", false, 1);

        DeltaApplier.Apply(asset, new AssetDelta([first], null, null));
        DeltaApplier.Apply(asset, new AssetDelta([second], null, null));

        Assert.Equal(2, asset.Items.Count);
    }

    [Fact]
    public void Edits_to_different_fields_of_one_item_both_apply()
    {
        var item = Item("old");
        var asset = AssetWith(item);

        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, "new", null, null)], null));
        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, null, true, null)], null));

        Assert.Equal("new", item.Text);
        Assert.True(item.IsDone);
    }

    [Fact]
    public void Same_field_last_write_wins()
    {
        var item = Item("start");
        var asset = AssetWith(item);

        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, "first", null, null)], null));
        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, "second", null, null)], null));

        Assert.Equal("second", item.Text);
    }

    [Fact]
    public void Deadline_can_be_set()
    {
        var item = Item("task");
        var asset = AssetWith(item);
        var deadline = new DateOnly(2026, 11, 12);

        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, null, null, null, deadline)], null));

        Assert.Equal(deadline, item.DeadlineDate);
    }

    [Fact]
    public void Deadline_can_be_cleared()
    {
        var item = Item("task");
        item.DeadlineDate = new DateOnly(2026, 11, 12);
        var asset = AssetWith(item);

        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, null, null, null, ClearDeadline: true)], null));

        Assert.Null(item.DeadlineDate);
    }

    [Fact]
    public void Deadline_cannot_be_set_and_cleared_in_one_change()
    {
        var item = Item("task");
        var asset = AssetWith(item);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(
                null,
                [new TodoItemChange(item.Id, null, null, null, new DateOnly(2026, 11, 12), ClearDeadline: true)],
                null)));

        Assert.Null(item.DeadlineDate);
    }

    [Fact]
    public void Edit_of_a_deleted_item_is_skipped_and_not_reported_as_applied()
    {
        var asset = AssetWith();
        var ghost = Guid.NewGuid();

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(ghost, "x", null, null)], [ghost]));

        Assert.True(applied.IsEmpty);
    }

    [Fact]
    public void Delete_wins_over_edit_in_the_same_delta()
    {
        var item = Item("x");
        var asset = AssetWith(item);

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(item.Id, "y", null, null)], [item.Id]));

        Assert.Empty(asset.Items);
        Assert.Single(applied.Deleted!);
        Assert.Empty(applied.Updated!);
    }

    [Fact]
    public void Reorders_only_touch_the_named_items()
    {
        var a = Item("a", 0);
        var b = Item("b", 1);
        var c = Item("c", 2);
        var asset = AssetWith(a, b, c);

        DeltaApplier.Apply(asset, new AssetDelta(null, [new TodoItemChange(a.Id, null, null, 5)], null));

        Assert.Equal(5, a.Order);
        Assert.Equal(1, b.Order);
        Assert.Equal(2, c.Order);
    }

    [Fact]
    public void Added_item_with_existing_id_is_rejected()
    {
        var item = Item("x");
        var asset = AssetWith(item);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta([new TodoItemDto(item.Id, "dup", false, 1)], null, null)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Empty_text_is_rejected(string text)
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta([new TodoItemDto(Guid.NewGuid(), text, false, 0)], null, null)));
    }

    [Fact]
    public void Too_long_text_is_rejected()
    {
        var asset = AssetWith();
        var text = new string('x', DeltaApplier.MaxTextLength + 1);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta([new TodoItemDto(Guid.NewGuid(), text, false, 0)], null, null)));
    }

    [Fact]
    public void Invalid_delta_changes_nothing()
    {
        var item = Item("x");
        var asset = AssetWith(item);
        var delta = new AssetDelta(
            [new TodoItemDto(Guid.NewGuid(), "", false, 1)],
            null,
            [item.Id]);

        Assert.Throws<InvalidDeltaException>(() => DeltaApplier.Apply(asset, delta));

        Assert.Single(asset.Items);
    }

    [Fact]
    public void Title_change_is_applied_and_reported()
    {
        var asset = AssetWith();
        asset.Title = "old";

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, null, null, "  new  "));

        Assert.Equal("new", asset.Title);
        Assert.Equal("new", applied.Title);
        Assert.False(applied.IsEmpty);
    }

    [Fact]
    public void Empty_title_is_rejected()
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, "  ")));
    }

    [Fact]
    public void Too_long_title_is_rejected()
    {
        var asset = AssetWith();
        var title = new string('x', DeltaApplier.MaxTitleLength + 1);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, title)));
    }
}
