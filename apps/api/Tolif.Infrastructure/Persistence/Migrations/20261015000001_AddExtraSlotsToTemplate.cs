using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tolif.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExtraSlotsToTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ExtraPersonsAllowed",
                table: "Templates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ExtraPetsAllowed",
                table: "Templates",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExtraPersonsAllowed",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "ExtraPetsAllowed",
                table: "Templates");
        }
    }
}
