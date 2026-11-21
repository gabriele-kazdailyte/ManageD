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
    public void Canvas_position_can_be_updated()
    {
        var asset = AssetWith();

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, null, null, X: 125f, Y: 240f));

        Assert.Equal(125f, asset.X);
        Assert.Equal(240f, asset.Y);
        Assert.Equal(125f, applied.X);
        Assert.Equal(240f, applied.Y);
        Assert.False(applied.IsEmpty);
    }

    [Fact]
    public void Canvas_position_can_be_negative()
    {
        var asset = AssetWith();

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, X: -120, Y: -45.5f));

        Assert.Equal(-120f, asset.X);
        Assert.Equal(-45.5f, asset.Y);
    }

    [Fact]
    public void Canvas_position_must_be_finite()
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, X: float.NaN)));
        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, Y: float.PositiveInfinity)));

        Assert.Equal(0, asset.X);
        Assert.Equal(0, asset.Y);
    }

    [Fact]
    public void Size_and_z_order_can_be_updated_and_are_echoed()
    {
        var asset = AssetWith();

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeX: 320f, SizeY: 200f, ZPos: 7));

        Assert.Equal(320f, asset.SizeX);
        Assert.Equal(200f, asset.SizeY);
        Assert.Equal(7, asset.ZPos);
        Assert.Equal(320f, applied.SizeX);
        Assert.Equal(200f, applied.SizeY);
        Assert.Equal(7, applied.ZPos);
        Assert.False(applied.IsEmpty);
    }

    [Fact]
    public void Each_layout_field_alone_makes_a_delta_non_empty()
    {
        Assert.False(new AssetDelta(null, null, null, SizeX: 200f).IsEmpty);
        Assert.False(new AssetDelta(null, null, null, SizeY: 200f).IsEmpty);
        Assert.False(new AssetDelta(null, null, null, ZPos: 0).IsEmpty);
    }

    [Fact]
    public void Size_fields_change_independently_and_omitted_ones_stay()
    {
        var asset = AssetWith();
        asset.SizeX = 300f;
        asset.SizeY = 250f;
        asset.ZPos = 3;

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeY: 400f));

        Assert.Equal(300f, asset.SizeX);
        Assert.Equal(400f, asset.SizeY);
        Assert.Equal(3, asset.ZPos);
    }

    [Fact]
    public void Size_zero_means_auto_and_the_range_edges_are_allowed()
    {
        var asset = AssetWith();

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeX: 160f, SizeY: 1200f));
        Assert.Equal(160f, asset.SizeX);
        Assert.Equal(1200f, asset.SizeY);

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeX: 0f, SizeY: 0f));
        Assert.Equal(0f, asset.SizeX);
        Assert.Equal(0f, asset.SizeY);
    }

    [Theory]
    [InlineData(159.9f)]
    [InlineData(1200.1f)]
    [InlineData(-200f)]
    [InlineData(float.NaN)]
    [InlineData(float.PositiveInfinity)]
    public void Size_outside_the_allowed_range_is_rejected(float size)
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeX: size)));
        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, SizeY: size)));

        Assert.Equal(0, asset.SizeX);
        Assert.Equal(0, asset.SizeY);
    }

    [Fact]
    public void A_rejected_size_leaves_the_rest_of_the_delta_unapplied()
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, X: 50f, SizeX: 10f, ZPos: 4)));

        Assert.Equal(0, asset.X);
        Assert.Equal(0, asset.ZPos);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(int.MaxValue)]
    public void Z_order_accepts_any_integer(int zPos)
    {
        var asset = AssetWith();

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, ZPos: zPos));

        Assert.Equal(zPos, asset.ZPos);
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
    public void Completing_an_item_records_and_broadcasts_its_completion_date()
    {
        var item = Item("task");
        var asset = AssetWith(item);

        var applied = DeltaApplier.Apply(
            asset,
            new AssetDelta(null, [new TodoItemChange(item.Id, null, true, null)], null));

        var expectedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.True(item.IsDone);
        Assert.Equal(expectedDate, item.CompletedDate);
        Assert.Equal(expectedDate, Assert.Single(applied.Updated!).CompletedDate);
    }

    [Fact]
    public void Reopening_an_item_clears_and_broadcasts_its_completion_date()
    {
        var item = Item("task");
        item.IsDone = true;
        item.CompletedDate = new DateOnly(2026, 11, 12);
        var asset = AssetWith(item);

        var applied = DeltaApplier.Apply(
            asset,
            new AssetDelta(null, [new TodoItemChange(item.Id, null, false, null)], null));

        Assert.False(item.IsDone);
        Assert.Null(item.CompletedDate);
        Assert.True(Assert.Single(applied.Updated!).ClearCompletedDate);
    }

    [Fact]
    public void Repeated_done_update_does_not_change_the_original_completion_date()
    {
        var originalCompletionDate = new DateOnly(2026, 11, 10);
        var item = Item("task");
        item.IsDone = true;
        item.CompletedDate = originalCompletionDate;
        var asset = AssetWith(item);

        var applied = DeltaApplier.Apply(
            asset,
            new AssetDelta(null, [new TodoItemChange(item.Id, null, true, null)], null));

        Assert.Equal(originalCompletionDate, item.CompletedDate);
        Assert.Equal(originalCompletionDate, Assert.Single(applied.Updated!).CompletedDate);
    }

    [Fact]
    public void Completion_date_cannot_be_changed_without_changing_done_state()
    {
        var item = Item("task");
        var asset = AssetWith(item);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(
                asset,
                new AssetDelta(null, [new TodoItemChange(item.Id, null, null, null, CompletedDate: new DateOnly(2026, 11, 12))], null)));

        Assert.Null(item.CompletedDate);
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

    [Fact]
    public void Note_content_is_applied_and_reported()
    {
        var asset = new Asset { Id = Guid.NewGuid(), TemplateType = TemplateType.Note };

        var applied = DeltaApplier.Apply(asset, new AssetDelta(null, null, null, NoteContent: "**Hello**"));

        Assert.Equal("**Hello**", asset.NoteContent);
        Assert.Equal("**Hello**", applied.NoteContent);
        Assert.False(applied.IsEmpty);
    }

    [Fact]
    public void Empty_note_content_clears_the_note()
    {
        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            TemplateType = TemplateType.Note,
            NoteContent = "previous",
        };

        DeltaApplier.Apply(asset, new AssetDelta(null, null, null, NoteContent: ""));

        Assert.Empty(asset.NoteContent);
    }

    [Fact]
    public void Note_content_cannot_be_applied_to_a_todo_asset()
    {
        var asset = AssetWith();

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, NoteContent: "text")));
    }

    [Fact]
    public void Items_cannot_be_added_to_a_note()
    {
        var asset = new Asset { Id = Guid.NewGuid(), TemplateType = TemplateType.Note };
        var delta = new AssetDelta([new TodoItemDto(Guid.NewGuid(), "item", false, 0)], null, null);

        Assert.Throws<InvalidDeltaException>(() => DeltaApplier.Apply(asset, delta));

        Assert.Empty(asset.Items);
    }

    [Fact]
    public void Items_cannot_be_updated_on_a_note()
    {
        var asset = new Asset { Id = Guid.NewGuid(), TemplateType = TemplateType.Note };
        var delta = new AssetDelta(
            null,
            [new TodoItemChange(Guid.NewGuid(), Text: "item", IsDone: null, Order: null)],
            null);

        Assert.Throws<InvalidDeltaException>(() => DeltaApplier.Apply(asset, delta));

        Assert.Empty(asset.Items);
    }

    [Fact]
    public void Too_long_note_content_is_rejected()
    {
        var asset = new Asset { Id = Guid.NewGuid(), TemplateType = TemplateType.Note };
        var content = new string('x', DeltaApplier.MaxNoteContentLength + 1);

        Assert.Throws<InvalidDeltaException>(() =>
            DeltaApplier.Apply(asset, new AssetDelta(null, null, null, NoteContent: content)));
    }
}
