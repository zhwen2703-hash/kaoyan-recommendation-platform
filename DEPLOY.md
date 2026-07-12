# 免费公网部署

推荐架构：GitHub Public Repository + Vercel Hobby。

## 工作方式

- Vercel 托管 Next.js 网站和 API。
- `data/*.json` 随代码部署，线上文件系统只读也能正常查询。
- GitHub Actions 每天北京时间约 02:20 同步研招网招生单位和严格 408 专业快照。
- 数据变化提交到仓库后，Vercel 自动触发新部署。
- 页面仍每 5 分钟检查最新已部署快照。

## 首次发布

1. 在 GitHub 创建公开仓库并推送本项目。
2. 在 Vercel 使用 GitHub 登录，导入该仓库。
3. Framework Preset 选择 Next.js，其余保持默认并部署。
4. 在 GitHub Actions 页面手动运行一次 `Sync official admission data` 验证自动更新。

## 限制

- Vercel Hobby 仅适合个人、非商业用途，并受免费额度限制。
- 免费域名为 `项目名.vercel.app`；自定义域名需要自行购买域名。
- 免费平台不能承诺永久不变，但仓库中的代码和数据可随时迁移到其他平台。
