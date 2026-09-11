interface ImportMeta {
  readonly env: {
    readonly SSG_MD: boolean;
  };
}

// 组件直接 import 的样式文件，由打包器抽成 CSS。
// components/ 现在也进了 tsconfig 的 include，所以这些声明是必须的。
declare module '*.css';
