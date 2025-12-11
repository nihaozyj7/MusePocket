; NSIS 安装器自定义配置

!macro customHeader
  !system "echo 正在准备安装 MusePocket..."
!macroend

!macro customInstall
  ; 创建数据目录
  CreateDirectory "$APPDATA\MusePocket"
  
  ; 写入注册表，确保使用独立的数据存储
  WriteRegStr HKCU "Software\MusePocket" "DataPath" "$APPDATA\MusePocket"
!macroend

!macro customUnInstall
  ; 询问是否保留用户数据
  MessageBox MB_YESNO "是否保留您的写作数据?" IDYES KeepData
    RMDir /r "$APPDATA\MusePocket"
  KeepData:
  
  ; 清理注册表
  DeleteRegKey HKCU "Software\MusePocket"
!macroend
