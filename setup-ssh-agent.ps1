# SSH Agent 配置脚本
# 此脚本需要以管理员权限运行

Write-Host "=== SSH Agent 配置 ===" -ForegroundColor Green
Write-Host ""

# 检查是否以管理员权限运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "错误：此脚本需要管理员权限运行" -ForegroundColor Red
    Write-Host ""
    Write-Host "请执行以下操作：" -ForegroundColor Yellow
    Write-Host "1. 右键点击 PowerShell" -ForegroundColor Yellow
    Write-Host "2. 选择 '以管理员身份运行'" -ForegroundColor Yellow
    Write-Host "3. 再次运行此脚本" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "或者直接运行以下命令（需要管理员权限）：" -ForegroundColor Yellow
    Write-Host "Set-Service -Name ssh-agent -StartupType Automatic" -ForegroundColor Cyan
    Write-Host "Start-Service ssh-agent" -ForegroundColor Cyan
    exit 1
}

Write-Host "✓ 检测到管理员权限" -ForegroundColor Green
Write-Host ""

# 配置 ssh-agent 服务
try {
    Write-Host "步骤 1: 设置 ssh-agent 为自动启动..." -ForegroundColor Yellow
    Set-Service -Name ssh-agent -StartupType Automatic
    Write-Host "✓ 设置成功" -ForegroundColor Green
    Write-Host ""

    Write-Host "步骤 2: 启动 ssh-agent 服务..." -ForegroundColor Yellow
    Start-Service ssh-agent
    Write-Host "✓ 启动成功" -ForegroundColor Green
    Write-Host ""

    Write-Host "步骤 3: 验证服务状态..." -ForegroundColor Yellow
    $service = Get-Service ssh-agent
    Write-Host "服务状态: $($service.Status)" -ForegroundColor Cyan
    Write-Host "启动类型: $($service.StartType)" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "=== 配置完成 ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步（在普通 PowerShell 中执行）：" -ForegroundColor Yellow
    Write-Host "ssh-add C:\Users\Johnny\.ssh\id_ed25519" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "输入密码后，之后的 git push 就不需要再输入密码了！" -ForegroundColor Green

} catch {
    Write-Host "配置失败: $_" -ForegroundColor Red
    exit 1
}

