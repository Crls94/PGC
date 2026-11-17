$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$config = Get-Content (Join-Path $env:TEMP 'pgc-demo-local.json') -Raw | ConvertFrom-Json
if (([uri]$config.databaseUrl).AbsolutePath -notmatch '^/pgc_demo_[a-z0-9_]+$') { throw 'Base de demo inválida' }
$env:DATABASE_URL = $config.databaseUrl
$env:JWT_SECRET = $config.jwtSecret
$env:PORT = '4014'
node dist/index.js
