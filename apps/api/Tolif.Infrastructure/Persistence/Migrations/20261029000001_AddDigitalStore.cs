using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tolif.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDigitalStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DigitalProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Tagline = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    Description = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    HeroImageKey = table.Column<string>(type: "text", nullable: true),
                    FeaturesJson = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalProducts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalProducts_Slug",
                table: "DigitalProducts",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateTable(
                name: "DigitalProductTiers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DigitalProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    TierName = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false, defaultValue: "EUR"),
                    FeaturesJson = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    StripePriceId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalProductTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalProductTiers_DigitalProducts_DigitalProductId",
                        column: x => x.DigitalProductId,
                        principalTable: "DigitalProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalProductTiers_DigitalProductId",
                table: "DigitalProductTiers",
                column: "DigitalProductId");

            migrationBuilder.CreateTable(
                name: "DigitalFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DigitalProductTierId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false, defaultValue: "application/octet-stream"),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalFiles_DigitalProductTiers_DigitalProductTierId",
                        column: x => x.DigitalProductTierId,
                        principalTable: "DigitalProductTiers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalFiles_DigitalProductTierId",
                table: "DigitalFiles",
                column: "DigitalProductTierId");

            migrationBuilder.CreateTable(
                name: "DigitalOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerEmail = table.Column<string>(type: "text", nullable: false),
                    CustomerName = table.Column<string>(type: "text", nullable: true),
                    DigitalProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    DigitalProductTierId = table.Column<Guid>(type: "uuid", nullable: false),
                    TierName = table.Column<string>(type: "text", nullable: false),
                    TierDisplayName = table.Column<string>(type: "text", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false, defaultValue: "EUR"),
                    StripeSessionId = table.Column<string>(type: "text", nullable: true),
                    StripePaymentIntentId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "pending"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalOrders_DigitalProducts_DigitalProductId",
                        column: x => x.DigitalProductId,
                        principalTable: "DigitalProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DigitalOrders_DigitalProductTiers_DigitalProductTierId",
                        column: x => x.DigitalProductTierId,
                        principalTable: "DigitalProductTiers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalOrders_DigitalProductId",
                table: "DigitalOrders",
                column: "DigitalProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalOrders_DigitalProductTierId",
                table: "DigitalOrders",
                column: "DigitalProductTierId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalOrders_StripeSessionId",
                table: "DigitalOrders",
                column: "StripeSessionId");

            migrationBuilder.CreateTable(
                name: "DigitalDownloadTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DigitalOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    DigitalFileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "text", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DownloadCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    MaxDownloads = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalDownloadTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalDownloadTokens_DigitalOrders_DigitalOrderId",
                        column: x => x.DigitalOrderId,
                        principalTable: "DigitalOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DigitalDownloadTokens_DigitalFiles_DigitalFileId",
                        column: x => x.DigitalFileId,
                        principalTable: "DigitalFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDownloadTokens_DigitalOrderId",
                table: "DigitalDownloadTokens",
                column: "DigitalOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDownloadTokens_DigitalFileId",
                table: "DigitalDownloadTokens",
                column: "DigitalFileId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDownloadTokens_Token",
                table: "DigitalDownloadTokens",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DigitalDownloadTokens");
            migrationBuilder.DropTable(name: "DigitalOrders");
            migrationBuilder.DropTable(name: "DigitalFiles");
            migrationBuilder.DropTable(name: "DigitalProductTiers");
            migrationBuilder.DropTable(name: "DigitalProducts");
        }
    }
}
