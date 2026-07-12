import { syncAdmissionUnits } from "../src/lib/sync";

async function main() {
  const snapshot = await syncAdmissionUnits();
  console.log(`同步完成：${snapshot.count} 个招生单位，时间 ${snapshot.syncedAt}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
