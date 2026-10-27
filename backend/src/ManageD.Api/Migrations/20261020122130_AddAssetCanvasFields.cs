using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ManageD.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetCanvasFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "SizeX",
                table: "Assets",
                type: "REAL",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "SizeY",
                table: "Assets",
                type: "REAL",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "X",
                table: "Assets",
                type: "REAL",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "Y",
                table: "Assets",
                type: "REAL",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<int>(
                name: "ZPos",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SizeX",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SizeY",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "X",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Y",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "ZPos",
                table: "Assets");
        }
    }
}
