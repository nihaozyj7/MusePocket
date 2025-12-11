# 批量更新导入路径的脚本
$ErrorActionPreference = "Stop"

# 定义路径映射规则
$pathMappings = @{
    # 旧路径 -> 新路径
    "from '@/db.ts'" = "from '@shared/db'"
    "from '@/db'" = "from '@shared/db'"
    "from '@/types.ts'" = "from '@shared/types'"
    "from '@/types'" = "from '@shared/types'"
    "from '@/utils.ts'" = "from '@shared/utils'"
    "from '@/utils'" = "from '@shared/utils'"
    "from '@/defaultObjects.ts'" = "from '@shared/constants/defaults'"
    "from '@/defaultObjects'" = "from '@shared/constants/defaults'"
    "from '@/eventManager.ts'" = "from '@shared/utils/event-bus'"
    "from '@/eventManager'" = "from '@shared/utils/event-bus'"
    "from '@/entityMappingService.ts'" = "from '@shared/utils/entity-mapping'"
    "from '@/entityMappingService'" = "from '@shared/utils/entity-mapping'"
    "from '@/historyUtils.ts'" = "from '@domains/editor/services/history.service'"
    "from '@/historyUtils'" = "from '@domains/editor/services/history.service'"
    "from '@/apis/index.ts'" = "from '@core/api'"
    "from '@/apis/index'" = "from '@core/api'"
    "from '@/apis'" = "from '@core/api'"
    "from '@/router.ts'" = "from '@app/router'"
    "from '@/router'" = "from '@app/router'"
    "from '@/plugins/confirm.ts'" = "from '@app/plugins'"
    "from '@/plugins/confirm'" = "from '@app/plugins'"
    "from '@/plugins/notyf.ts'" = "from '@app/plugins'"
    "from '@/plugins/notyf'" = "from '@app/plugins'"

    # Store 路径
    "from '@/stores/HistoryStore.ts'" = "from '@domains/editor/stores/history.store'"
    "from '@/stores/HistoryStore'" = "from '@domains/editor/stores/history.store'"
    "from '@/stores/SelectedArticleStore.ts'" = "from '@domains/editor/stores/selected-article.store'"
    "from '@/stores/SelectedArticleStore'" = "from '@domains/editor/stores/selected-article.store'"
    "from '@/stores/TextSnippetsStore.ts'" = "from '@domains/editor/stores/text-snippets.store'"
    "from '@/stores/TextSnippetsStore'" = "from '@domains/editor/stores/text-snippets.store'"
    "from '@/stores/SelectedBookStore.ts'" = "from '@domains/library/stores/selected-book.store'"
    "from '@/stores/SelectedBookStore'" = "from '@domains/library/stores/selected-book.store'"
    "from '@/stores/EntitysStore.ts'" = "from '@domains/library/stores/entities.store'"
    "from '@/stores/EntitysStore'" = "from '@domains/library/stores/entities.store'"
    "from '@/stores/EntityTypesStore.ts'" = "from '@domains/library/stores/entity-types.store'"
    "from '@/stores/EntityTypesStore'" = "from '@domains/library/stores/entity-types.store'"
    "from '@/stores/SettingStore.ts'" = "from '@domains/settings/stores/settings.store'"
    "from '@/stores/SettingStore'" = "from '@domains/settings/stores/settings.store'"
    "from '@/stores/ModelsStore.ts'" = "from '@domains/settings/stores/models.store'"
    "from '@/stores/ModelsStore'" = "from '@domains/settings/stores/models.store'"
    "from '@/stores/PromptsStore.ts'" = "from '@domains/settings/stores/prompts.store'"
    "from '@/stores/PromptsStore'" = "from '@domains/settings/stores/prompts.store'"
    "from '@/stores/PresetsStore.ts'" = "from '@domains/settings/stores/presets.store'"
    "from '@/stores/PresetsStore'" = "from '@domains/settings/stores/presets.store'"

    # 组件路径 (通用组件)
    "from '@/components/Popup.vue'" = "from '@shared/components'"
    "from '@/components/ContextMenu.vue'" = "from '@shared/components'"
    "from '@/components/ConfirmDialog.vue'" = "from '@shared/components'"
    "from '@/components/EditBookPopup.vue'" = "from '@shared/components'"
    "from '@/components/SelectCoverPopup.vue'" = "from '@shared/components'"
    "from '@/components/HistoryViewPopup.vue'" = "from '@shared/components'"
}

Write-Host "开始更新导入路径..." -ForegroundColor Green

# 获取所有需要更新的文件
$files = Get-ChildItem -Path "src" -Include "*.vue","*.ts" -Recurse -File |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" }

$totalFiles = $files.Count
$updatedFiles = 0
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    Write-Progress -Activity "更新导入路径" -Status "处理文件 $currentFile / $totalFiles" -PercentComplete (($currentFile / $totalFiles) * 100)

    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content

    # 应用所有路径映射
    foreach ($mapping in $pathMappings.GetEnumerator()) {
        $content = $content -replace [regex]::Escape($mapping.Key), $mapping.Value
    }

    # 如果内容有变化,则写回文件
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $updatedFiles++
        Write-Host "✓ 更新: $($file.FullName)" -ForegroundColor Cyan
    }
}

Write-Progress -Activity "更新导入路径" -Completed
Write-Host "`n更新完成!" -ForegroundColor Green
Write-Host "总文件数: $totalFiles" -ForegroundColor Yellow
Write-Host "已更新: $updatedFiles" -ForegroundColor Yellow
