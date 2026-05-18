$photoDir = Join-Path $PSScriptRoot "assets\photos"

if (-not (Test-Path -LiteralPath $photoDir)) {
  New-Item -ItemType Directory -Force -Path $photoDir | Out-Null
}

$extensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif")
$photos = Get-ChildItem -LiteralPath $photoDir -File |
  Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object @{ Expression = {
    if ($_.BaseName -match '^\d+$') {
      [int]$_.BaseName
    } else {
      [int]::MaxValue
    }
  } }, Name

if ($photos.Count -eq 0) {
  Write-Host "No photos found in assets/photos. Add photos there, then run this script again."
  exit 0
}

$tempPrefix = "__xiaoheer_photo_tmp__"
$tempFiles = @()

for ($i = 0; $i -lt $photos.Count; $i += 1) {
  $tempName = "{0}{1}{2}" -f $tempPrefix, $i, $photos[$i].Extension.ToLowerInvariant()
  $tempPath = Join-Path $photoDir $tempName
  Move-Item -LiteralPath $photos[$i].FullName -Destination $tempPath -Force
  $tempFiles += Get-Item -LiteralPath $tempPath
}

for ($i = 0; $i -lt $tempFiles.Count; $i += 1) {
  $targetName = "{0}.jpg" -f ($i + 1)
  $targetPath = Join-Path $photoDir $targetName
  Move-Item -LiteralPath $tempFiles[$i].FullName -Destination $targetPath -Force
}

Write-Host "Photo rename complete:"
$renamedPhotos = Get-ChildItem -LiteralPath $photoDir -File |
  Where-Object { $_.Name -match '^\d+\.jpg$' } |
  Sort-Object { [int]($_.BaseName) }

$manifest = $renamedPhotos |
  ForEach-Object { $_.Name } |
  ConvertTo-Json

if ($renamedPhotos.Count -eq 1) {
  $manifest = "[" + $manifest + "]"
}

$manifestPath = Join-Path $photoDir "photos.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($manifestPath, $manifest, $utf8NoBom)

$scriptPath = Join-Path $PSScriptRoot "script.js"
if (Test-Path -LiteralPath $scriptPath) {
  $scriptContent = [System.IO.File]::ReadAllText($scriptPath)
  $scriptContent = $scriptContent -replace 'const PHOTO_TOTAL = \d+;', "const PHOTO_TOTAL = $($renamedPhotos.Count);"
  [System.IO.File]::WriteAllText($scriptPath, $scriptContent, $utf8NoBom)
}

$renamedPhotos | ForEach-Object { Write-Host ("- " + $_.Name) }
Write-Host ("Manifest updated: assets/photos/photos.json")
Write-Host ("Photo total updated: " + $renamedPhotos.Count)
