using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tolif.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStyleToTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Style",
                table: "Templates",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Style",
                table: "Templates");
        }
    }
}
