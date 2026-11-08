using ManageD.Api.Common;
using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public static class DeltaApplier
{
    public const int MaxTextLength = 200;

    /// <summary>
    /// Applies the delta to the asset and returns what was really applied
    /// (entries for items that no longer exist are dropped).
    /// Throws InvalidDeltaException before changing anything if the delta breaks the contract.
    /// </summary>
    public static AssetDelta Apply(Asset asset, AssetDelta delta)
    {
        var added = delta.Added ?? [];
        var updated = delta.Updated ?? [];
        var deleted = delta.Deleted ?? [];

        Validate(asset, added, updated);

        // 1. Deletes first: an edit of an item deleted in the same delta is skipped
        var appliedDeleted = new List<Guid>();
        foreach (var id in deleted.Distinct())
        {
            var item = asset.Items.FirstOrDefault(i => i.Id == id);
            if (item is null)
            {
                continue;
            }

            asset.Items.Remove(item);
            appliedDeleted.Add(id);
        }

        // 2. Updates: only the fields that were sent, only for items that still exist
        var appliedUpdated = new List<TodoItemChange>();
        foreach (var change in updated)
        {
            var item = asset.Items.FirstOrDefault(i => i.Id == change.Id);
            if (item is null)
            {
                continue;
            }

            if (change.Text is not null)
            {
                item.Text = change.Text.Trim();
            }

            if (change.IsDone is not null)
            {
                item.IsDone = change.IsDone.Value;
            }

            if (change.Order is not null)
            {
                item.Order = change.Order.Value;
            }

            appliedUpdated.Add(change);
        }

        var appliedAdded = new List<TodoItemDto>();
        foreach (var dto in added)
        {
            asset.Items.Add(new TodoItem
            {
                Id = dto.Id,
                AssetId = asset.Id,
                Text = dto.Text.Trim(),
                IsDone = dto.IsDone,
                Order = dto.Order,
            });
            appliedAdded.Add(dto with { Text = dto.Text.Trim() });
        }

        return new AssetDelta(appliedAdded, appliedUpdated, appliedDeleted);
    }

    private static void Validate(
        Asset asset,
        IReadOnlyList<TodoItemDto> added,
        IReadOnlyList<TodoItemChange> updated)
    {
        var seen = new HashSet<Guid>();
        foreach (var dto in added)
        {
            ValidateText(dto.Text);

            if (!seen.Add(dto.Id) || asset.Items.Any(i => i.Id == dto.Id))
            {
                throw new InvalidDeltaException($"Item {dto.Id} already exists.");
            }
        }

        foreach (var change in updated)
        {
            if (change.Text is not null)
            {
                ValidateText(change.Text);
            }
        }
    }

    private static void ValidateText(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.Length == 0)
        {
            throw new InvalidDeltaException("Item text can't be empty.");
        }

        if (trimmed.Length > MaxTextLength)
        {
            throw new InvalidDeltaException($"Item text can't be longer than {MaxTextLength} characters.");
        }
    }
}
