FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Tolif.Domain/Tolif.Domain.csproj         Tolif.Domain/
COPY Tolif.Application/Tolif.Application.csproj Tolif.Application/
COPY Tolif.Infrastructure/Tolif.Infrastructure.csproj Tolif.Infrastructure/
COPY Tolif.API/Tolif.API.csproj               Tolif.API/
RUN dotnet restore Tolif.API/Tolif.API.csproj

COPY . .
RUN dotnet publish Tolif.API/Tolif.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN mkdir -p /app/dataprotection-keys
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Tolif.API.dll"]
