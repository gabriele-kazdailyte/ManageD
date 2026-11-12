using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ManageD.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoItemDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DeadlineDate",
                table: "TodoItems",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeadlineDate",
                table: "TodoItems");
        }
    }
}
