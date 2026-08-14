# Extrae el logo de public/LOGO.jpeg quitándole el fondo.
#
# El fondo es papel texturado, no blanco plano: recortar por luminosidad deja
# motas grises. El criterio es la SATURACIÓN, que separa limpio el gris del
# papel del azul del logo, y además da alfa parcial en los bordes suavizados.
#
# Salidas en public/:
#   logo-caleta.png         color de marca, para fondos claros
#   logo-caleta-blanco.png  blanco, para el header marino
#   icon.png en src/app/    favicon que Next toma solo
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts/extraer-logo.ps1

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$origen = Join-Path $raiz "public\LOGO.jpeg"
if (-not (Test-Path $origen)) { throw "No existe $origen" }

$src = [System.Drawing.Bitmap]::FromFile($origen)
Write-Host "Origen: $($src.Width)x$($src.Height)"

# Lectura rápida: GetPixel sobre 2,4 millones de píxeles es inviable.
$rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
$datos = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$total = [Math]::Abs($datos.Stride) * $src.Height
$bytes = New-Object byte[] $total
[System.Runtime.InteropServices.Marshal]::Copy($datos.Scan0, $bytes, 0, $total)
$src.UnlockBits($datos)
$stride = $datos.Stride

# Umbrales de saturación: bajo SAT_MIN es papel, sobre SAT_MAX es logo puro,
# y en medio el borde antialiaseado, que recibe alfa proporcional.
$SAT_MIN = 0.10
$SAT_MAX = 0.30

# Color de marca muestreado del propio logo (azul petróleo).
$marca = @{ R = 21; G = 90; B = 114 }

function Nueva-Bitmap($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  return $bmp
}

$w = $src.Width
$h = $src.Height
$color = Nueva-Bitmap $w $h
$blanco = Nueva-Bitmap $w $h

$dstColor = $color.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstBlanco = $blanco.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$salidaColor = New-Object byte[] $total
$salidaBlanco = New-Object byte[] $total

$opacos = 0
$parciales = 0

for ($y = 0; $y -lt $h; $y++) {
  $fila = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $fila + $x * 4
    $b = $bytes[$i]
    $g = $bytes[$i + 1]
    $r = $bytes[$i + 2]

    $max = [Math]::Max($r, [Math]::Max($g, $b))
    $min = [Math]::Min($r, [Math]::Min($g, $b))
    $sat = if ($max -eq 0) { 0 } else { ($max - $min) / [double]$max }

    $alfa = if ($sat -le $SAT_MIN) { 0.0 }
            elseif ($sat -ge $SAT_MAX) { 1.0 }
            else { ($sat - $SAT_MIN) / ($SAT_MAX - $SAT_MIN) }

    if ($alfa -gt 0) {
      if ($alfa -ge 1) { $opacos++ } else { $parciales++ }
      $a = [byte][Math]::Round($alfa * 255)

      # Color plano de marca: el logo tiene un degradado suave que a 32 px no se
      # ve y sí produce bordes sucios. Plano queda más limpio en la UI.
      $salidaColor[$i]     = [byte]$marca.B
      $salidaColor[$i + 1] = [byte]$marca.G
      $salidaColor[$i + 2] = [byte]$marca.R
      $salidaColor[$i + 3] = $a

      $salidaBlanco[$i]     = 255
      $salidaBlanco[$i + 1] = 255
      $salidaBlanco[$i + 2] = 255
      $salidaBlanco[$i + 3] = $a
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($salidaColor, 0, $dstColor.Scan0, $total)
[System.Runtime.InteropServices.Marshal]::Copy($salidaBlanco, 0, $dstBlanco.Scan0, $total)
$color.UnlockBits($dstColor)
$blanco.UnlockBits($dstBlanco)

Write-Host "Pixeles del logo: $opacos opacos, $parciales de borde"

function Recortar-Y-Guardar($bmp, $ruta, $lado) {
  # Recorta al contenido visible y deja un margen del 4% para que el logo no
  # quede pegado al borde del contenedor.
  $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
  $r2 = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $d = $bmp.LockBits($r2, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $t = [Math]::Abs($d.Stride) * $bmp.Height
  $bs = New-Object byte[] $t
  [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $bs, 0, $t)
  $bmp.UnlockBits($d)

  for ($y = 0; $y -lt $bmp.Height; $y++) {
    $f = $y * $d.Stride
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ($bs[$f + $x * 4 + 3] -gt 24) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $ancho = $maxX - $minX + 1
  $alto = $maxY - $minY + 1
  $lienzo = [Math]::Max($ancho, $alto)
  $margen = [int]($lienzo * 0.04)
  $lienzo = $lienzo + $margen * 2

  $final = New-Object System.Drawing.Bitmap $lado, $lado, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g2 = [System.Drawing.Graphics]::FromImage($final)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $escala = $lado / [double]$lienzo
  $destino = New-Object System.Drawing.Rectangle(
    [int](($lado - $ancho * $escala) / 2),
    [int](($lado - $alto * $escala) / 2),
    [int]($ancho * $escala),
    [int]($alto * $escala)
  )
  $origenRect = New-Object System.Drawing.Rectangle $minX, $minY, $ancho, $alto
  $g2.DrawImage($bmp, $destino, $origenRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g2.Dispose()
  $final.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  $ruta ($lado x $lado, recortado de ${ancho}x${alto})"
  $final.Dispose()
}

Recortar-Y-Guardar $color (Join-Path $raiz "public\logo-caleta.png") 512
Recortar-Y-Guardar $blanco (Join-Path $raiz "public\logo-caleta-blanco.png") 512
Recortar-Y-Guardar $color (Join-Path $raiz "src\app\icon.png") 180

$color.Dispose()
$blanco.Dispose()
$src.Dispose()
Write-Host "Listo."
