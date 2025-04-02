# TimeRem - 时间记录应用

一个基于Vue.js和Ionic的跨平台时间记录应用。

## 功能特点

- 计时功能
- 历史记录
- 数据导出
- 跨平台支持

## 开发环境要求

- Node.js 16+
- npm 7+
- Java 17 (用于Android构建)
- Android Studio (用于Android构建)

## 安装步骤

1. 克隆项目
```bash
git clone https://github.com/PoKuiJiHua/timeRem.git
cd timeRem
```

2. 安装依赖
```bash
npm install
```

3. 开发模式运行
```bash
npm run dev
```

## 构建Android应用

1. 安装Capacitor
```bash
npm install @capacitor/cli
```

2. 添加Android平台
```bash
npx cap add android
```

3. 构建Web项目
```bash
npm run build
```

4. 复制Web资源到Android项目
```bash
npx cap copy android
```

5. 打开Android Studio
```bash
npx cap open android
```

6. 在Android Studio中构建APK
- 点击 Build -> Build Bundle(s) / APK(s) -> Build APK(s)
- 等待构建完成
- 在 `android/app/build/outputs/apk/debug/` 目录下找到生成的APK文件

## 注意事项

- 确保已安装Java 17
- 确保已安装Android Studio
- 确保Android SDK路径正确配置
- 首次构建可能需要较长时间，请耐心等待

## 许可证

MIT 