param([int]$Port = 8766)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Sirviendo $root en http://localhost:$Port/ (sin cache)"
$mime = @{ '.html'='text/html'; '.js'='application/javascript'; '.css'='text/css'; '.json'='application/json'; '.pdf'='application/pdf'; '.md'='text/plain' }
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request; $res = $ctx.Response
    try {
        $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($path -eq '/') { $path = '/index.html' }
        $full = Join-Path $root ($path.TrimStart('/'))
        if (Test-Path $full -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($full)
            $res.ContentType = $mime[$ext]; if (-not $res.ContentType) { $res.ContentType = 'application/octet-stream' }
            $res.Headers.Add('Cache-Control', 'no-store')
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
    } catch { $res.StatusCode = 500 } finally { $res.OutputStream.Close() }
}
