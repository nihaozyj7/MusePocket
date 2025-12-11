# 修复相对导入路径的脚本
$ErrorActionPreference = "Stop"

Write-Host "修复相对导入路径..." -ForegroundColor Green

# Editor 域组件
$editorFiles = Get-ChildItem -Path "src\domains\editor\components" -Filter "*.vue"
foreach ($file in $editorFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace "import Popup from '\./Popup\.vue'", "import { Popup } from '@shared/components'"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✓ 更新: $($file.Name)" -ForegroundColor Cyan
}

# Library 域组件
$libraryFiles = Get-ChildItem -Path "src\domains\library\components" -Filter "*.vue"
foreach ($file in $libraryFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace "import Popup from '\./Popup\.vue'", "import { Popup } from '@shared/components'"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✓ 更新: $($file.Name)" -ForegroundColor Cyan
}

# Settings 域组件
$settingsFiles = Get-ChildItem -Path "src\domains\settings\components" -Filter "*.vue"
foreach ($file in $settingsFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace "import Popup from '\./Popup\.vue'", "import { Popup } from '@shared/components'"
    $content = $content -replace "import SelectCoverPopup from '\./SelectCoverPopup\.vue'", "import { SelectCoverPopup } from '@shared/components'"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✓ 更新: $($file.Name)" -ForegroundColor Cyan
}

# Shared 组件
$sharedFiles = Get-ChildItem -Path "src\shared\components" -Filter "*.vue"
foreach ($file in $sharedFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace "import Popup from '\./Popup\.vue'", "import { Popup } from '@shared/components'"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✓ 更新: $($file.Name)" -ForegroundColor Cyan
}

# 修复 history.store.ts 中的动态导入
$historyStorePath = "src\domains\editor\stores\history.store.ts"
$content = Get-Content $historyStorePath -Raw -Encoding UTF8
$content = $content -replace 'await import\("@/historyUtils"\)', 'await import("@domains/editor/services/history.service")'
$content = $content -replace "await import\('@/historyUtils'\)", "await import('@domains/editor/services/history.service')"
Set-Content -Path $historyStorePath -Value $content -Encoding UTF8 -NoNewline
Write-Host "✓ 更新: history.store.ts" -ForegroundColor Cyan

# 修复 models.store.ts 中的错误导入
$modelsStorePath = "src\domains\settings\stores\models.store.ts"
if (Test-Path $modelsStorePath) {
    $content = Get-Content $modelsStorePath -Raw -Encoding UTF8
    $content = $content -replace 'import \{\} from "\.\./\.\.\/apis/index"', ''
    $content = $content -replace "import \{\} from '\.\./\.\.\/apis/index'", ''
    $content = $content -replace 'import \{\} from "\.\./apis/index"', ''
    $content = $content -replace "import \{\} from '\.\./apis/index'", ''
    Set-Content -Path $modelsStorePath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✓ 更新: models.store.ts" -ForegroundColor Cyan
}

Write-Host "`n修复完成!" -ForegroundColor Green
