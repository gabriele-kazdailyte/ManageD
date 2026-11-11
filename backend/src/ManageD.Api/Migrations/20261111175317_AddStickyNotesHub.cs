using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ManageD.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStickyNotesHub : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NoteContent",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NoteContent",
                table: "Assets");
        }
    }
}
