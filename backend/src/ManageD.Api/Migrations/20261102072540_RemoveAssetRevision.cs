using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ManageD.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAssetRevision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Revision",
                table: "Assets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Revision",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
