FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy all csproj files + solution first for layer-cached restore
COPY Tolif.Domain/Tolif.Domain.csproj             Tolif.Domain/
COPY Tolif.Application/Tolif.Application.csproj   Tolif.Application/
COPY Tolif.Infrastructure/Tolif.Infrastructure.csproj Tolif.Infrastructure/
COPY Tolif.API/Tolif.API.csproj                   Tolif.API/
COPY Tolif.slnx .

# Restore entire solution so every project's packages are fully cached
RUN dotnet restore Tolif.slnx

COPY . .
RUN dotnet publish Tolif.API/Tolif.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
# Install Liberation fonts so WatermarkService can render text on Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/dataprotection-keys
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Tolif.API.dll"]
