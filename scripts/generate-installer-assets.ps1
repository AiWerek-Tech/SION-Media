param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$buildDir = Join-Path $ProjectRoot 'build'
$iconPath = Join-Path $ProjectRoot 'resources\branding\app-icon.png'
$sidebarPath = Join-Path $buildDir 'installerSidebar.bmp'
$uninstallerPath = Join-Path $buildDir 'uninstallerSidebar.bmp'
$headerPath = Join-Path $buildDir 'installerHeader.bmp'
$windowsIconPath = Join-Path $ProjectRoot 'build\icon.ico'

if (-not (Test-Path -LiteralPath $iconPath)) {
  throw "Brand icon not found: $iconPath"
}

function New-GradientBitmap {
  param(
    [int]$Width,
    [int]$Height,
    [System.Drawing.Color]$TopColor,
    [System.Drawing.Color]$BottomColor
  )

  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $area = [System.Drawing.Rectangle]::new(0, 0, $Width, $Height)
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $area,
    $TopColor,
    $BottomColor,
    145.0
  )
  $graphics.FillRectangle($brush, $area)
  $brush.Dispose()

  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-WindowsIcon {
  $sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)
  $source = [System.Drawing.Image]::FromFile($iconPath)
  $frames = [System.Collections.Generic.List[byte[]]]::new()

  try {
    foreach ($size in $sizes) {
      $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
        $stream = [System.IO.MemoryStream]::new()
        $writer = [System.IO.BinaryWriter]::new($stream)
        $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
        $data = $bitmap.LockBits(
          $rect,
          [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
          [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )

        try {
          $xorSize = $size * $size * 4
          $maskStride = [int]([Math]::Ceiling($size / 32.0) * 4)
          $writer.Write([uint32]40)
          $writer.Write([int32]$size)
          $writer.Write([int32]($size * 2))
          $writer.Write([uint16]1)
          $writer.Write([uint16]32)
          $writer.Write([uint32]0)
          $writer.Write([uint32]$xorSize)
          $writer.Write([int32]0)
          $writer.Write([int32]0)
          $writer.Write([uint32]0)
          $writer.Write([uint32]0)

          $row = [byte[]]::new($size * 4)
          for ($y = $size - 1; $y -ge 0; $y--) {
            $rowPointer = [IntPtr]::Add($data.Scan0, $y * $data.Stride)
            [System.Runtime.InteropServices.Marshal]::Copy($rowPointer, $row, 0, $row.Length)
            $writer.Write($row)
          }

          $writer.Write([byte[]]::new($maskStride * $size))
        }
        finally {
          $bitmap.UnlockBits($data)
          $writer.Dispose()
        }

        $frames.Add($stream.ToArray())
        $stream.Dispose()
      }
      finally {
        $graphics.Dispose()
        $bitmap.Dispose()
      }
    }

    $file = [System.IO.File]::Open($windowsIconPath, [System.IO.FileMode]::Create)
    $writer = [System.IO.BinaryWriter]::new($file)

    try {
      $writer.Write([uint16]0)
      $writer.Write([uint16]1)
      $writer.Write([uint16]$sizes.Count)
      $offset = 6 + (16 * $sizes.Count)

      for ($index = 0; $index -lt $sizes.Count; $index++) {
        $size = $sizes[$index]
        $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
        $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$frames[$index].Length)
        $writer.Write([uint32]$offset)
        $offset += $frames[$index].Length
      }

      foreach ($frame in $frames) {
        $writer.Write($frame)
      }
    }
    finally {
      $writer.Dispose()
      $file.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

function Save-Sidebar {
  param(
    [string]$Path,
    [string]$Footer
  )

  $canvas = New-GradientBitmap 164 314 ([System.Drawing.Color]::FromArgb(15, 37, 73)) ([System.Drawing.Color]::FromArgb(4, 9, 18))
  $bitmap = $canvas.Bitmap
  $graphics = $canvas.Graphics
  $icon = [System.Drawing.Image]::FromFile($iconPath)

  try {
    $accentPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(50, 184, 255), 2)
    $graphics.DrawLine($accentPen, 20, 18, 72, 18)
    $accentPen.Dispose()

    $graphics.DrawImage($icon, [System.Drawing.Rectangle]::new(52, 42, 60, 60))

    $center = [System.Drawing.StringFormat]::new()
    $center.Alignment = [System.Drawing.StringAlignment]::Center
    $titleFont = [System.Drawing.Font]::new('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $labelFont = [System.Drawing.Font]::new('Segoe UI', 6.5, [System.Drawing.FontStyle]::Bold)
    $bodyFont = [System.Drawing.Font]::new('Segoe UI', 7.25, [System.Drawing.FontStyle]::Regular)
    $footerFont = [System.Drawing.Font]::new('Segoe UI', 6, [System.Drawing.FontStyle]::Bold)

    $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 249, 255))
    $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(56, 189, 248))
    $mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(143, 166, 198))

    $graphics.DrawString('SION Media', $titleFont, $whiteBrush, [System.Drawing.RectangleF]::new(10, 116, 144, 25), $center)
    $graphics.DrawString('PRESENTASI IBADAH', $labelFont, $accentBrush, [System.Drawing.RectangleF]::new(8, 146, 148, 16), $center)
    $graphics.DrawString('Siapkan lagu, Alkitab, media, dan layar jemaat dalam satu ruang kerja.', $bodyFont, $mutedBrush, [System.Drawing.RectangleF]::new(20, 181, 124, 60), $center)
    $graphics.DrawString($Footer, $footerFont, $accentBrush, [System.Drawing.RectangleF]::new(10, 282, 144, 18), $center)

    $center.Dispose()
    $titleFont.Dispose(); $labelFont.Dispose(); $bodyFont.Dispose(); $footerFont.Dispose()
    $whiteBrush.Dispose(); $accentBrush.Dispose(); $mutedBrush.Dispose()
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  }
  finally {
    $icon.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-Header {
  $canvas = New-GradientBitmap 150 57 ([System.Drawing.Color]::FromArgb(17, 42, 80)) ([System.Drawing.Color]::FromArgb(6, 13, 25))
  $bitmap = $canvas.Bitmap
  $graphics = $canvas.Graphics
  $icon = [System.Drawing.Image]::FromFile($iconPath)

  try {
    $graphics.DrawImage($icon, [System.Drawing.Rectangle]::new(12, 10, 36, 36))
    $titleFont = [System.Drawing.Font]::new('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $labelFont = [System.Drawing.Font]::new('Segoe UI', 6, [System.Drawing.FontStyle]::Regular)
    $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(246, 249, 255))
    $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(56, 189, 248))
    $graphics.DrawString('SION Media', $titleFont, $whiteBrush, 55, 12)
    $graphics.DrawString('INSTALASI', $labelFont, $accentBrush, 56, 31)
    $titleFont.Dispose(); $labelFont.Dispose(); $whiteBrush.Dispose(); $accentBrush.Dispose()
    $bitmap.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  }
  finally {
    $icon.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
Save-WindowsIcon
Save-Sidebar -Path $sidebarPath -Footer 'AMAN  |  CEPAT  |  TERPERCAYA'
Save-Sidebar -Path $uninstallerPath -Footer 'DATA PENGGUNA TETAP AMAN'
Save-Header

Write-Output "Generated installer assets in $buildDir"
