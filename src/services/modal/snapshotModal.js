/**
 * 快照管理模态框
 *
 * @description 数据快照的创建/恢复/覆盖/删除操作界面，支持登录快照和手动快照
 * @module snapshotModal
 */
import { registry } from '../../core/registry.js';
export class SnapshotModal {
    constructor(modalService) {
        this.modal = modalService;
    }

    async show() {
        const snapshots = await registry.get('utils').getSnapshots();
        const loginSnapshots = snapshots.filter(s => s.type === 'login');
        const autoSnapshots = snapshots.filter(s => s.type === 'auto');
        const manualSnapshots = snapshots.filter(s => s.type === 'manual');

        const generateSnapshotHtml = (snapshotList, title, type, showOverwrite = false) => {
            if (snapshotList.length === 0) {
                return `<div class="mb-6"><h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4><p class="text-center p-3 border rounded-lg" style="color: var(--text-secondary); border-color: var(--border-color);">暂无快照</p></div>`;
            }
            const items = snapshotList.map(snapshot => {
                const date = new Date(snapshot.timestamp);
                const formattedDate = date.toLocaleString();
                const studentCount = snapshot.data.students?.length || 0;
                const courseCount = snapshot.data.courses?.length || 0;
                const typeText = snapshot.type === 'login' ? '登录' : snapshot.type === 'auto' ? '自动' : '手动';
                return `<div class="p-3 border rounded-lg mb-2 flex justify-between items-center" style="border-color: var(--border-color);">
                    <div><div class="font-medium" style="color: var(--text-primary);">${formattedDate} (${typeText})</div><div class="text-sm" style="color: var(--text-secondary);">学生: ${studentCount}人, 课程: ${courseCount}节</div></div>
                    <div class="flex space-x-2">
                        <button class="restore-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-success); color: white;" data-id="${snapshot.id}">恢复</button>
                        ${showOverwrite ? `<button class="overwrite-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-primary); color: white;" data-id="${snapshot.id}">覆盖</button>` : ''}
                    </div></div>`;
            }).join('');
            return `<div class="mb-6"><h4 class="font-medium mb-2" style="color: var(--text-primary);">${title}</h4><div>${items}</div></div>`;
        };

        const generateManualHtml = (list) => {
            const html = [];
            for (let i = 0; i < list.length; i++) {
                const s = list[i];
                const date = new Date(s.timestamp);
                html.push(`<div class="p-3 border rounded-lg mb-2 flex justify-between items-center" style="border-color: var(--border-color);">
                    <div><div class="font-medium" style="color: var(--text-primary);">${date.toLocaleString()} (手动)</div><div class="text-sm" style="color: var(--text-secondary);">学生: ${s.data.students?.length || 0}人, 课程: ${s.data.courses?.length || 0}节</div></div>
                    <div class="flex space-x-2">
                        <button class="restore-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-success); color: white;" data-id="${s.id}">恢复</button>
                        <button class="overwrite-snapshot px-2 py-1 rounded text-xs transition-colors" style="background-color: var(--color-primary); color: white;" data-id="${s.id}">覆盖</button>
                    </div></div>`);
            }
            for (let i = list.length; i < 3; i++) {
                html.push(`<div class="p-3 border rounded-lg mb-2 flex justify-between items-center cursor-pointer hover:bg-content transition-colors" style="border-color: var(--border-color); background-color: var(--bg-secondary);" data-action="create-manual-snapshot">
                    <div class="text-center w-full"><div class="font-medium" style="color: var(--text-secondary);">空快照栏位 ${i + 1}</div><div class="text-sm" style="color: var(--text-secondary);">点击创建快照</div></div></div>`);
            }
            return `<div class="mb-6"><h4 class="font-medium mb-2" style="color: var(--text-primary);">手动快照 (最多3个)</h4><div>${html.join('')}</div></div>`;
        };

        const content = `<div class="rounded-lg shadow-xl w-full max-w-md mx-4" style="background-color: var(--bg-secondary);"><div class="p-6"><div class="mb-6"><h3 class="text-lg font-semibold" style="color: var(--text-primary);">快照管理</h3></div><div class="max-h-[75vh] overflow-y-auto">${generateSnapshotHtml(loginSnapshots, '登录快照', 'login', false)}${generateSnapshotHtml(autoSnapshots, '自动快照 (每15分钟)', 'auto', false)}${generateManualHtml(manualSnapshots)}</div></div></div>`;

        this.modal.show(content, {
            onShow: () => {
                if (registry.get('lucide')) registry.get('lucide').createIcons();

                document.querySelectorAll('[data-action="create-manual-snapshot"]').forEach(div => {
                    div.addEventListener('click', async () => {
                        await registry.get('utils').createSnapshot('manual');
                        setTimeout(() => this.show(), 500);
                    });
                });

                document.querySelectorAll('.restore-snapshot').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const snapshotId = btn.getAttribute('data-id');
                        this.modal.showConfirm('确定要恢复此快照吗？<br>这将覆盖当前数据。', async () => {
                            await registry.get('utils').restoreSnapshot(snapshotId);
                            this.modal.hide();
                        }, 'warning');
                    });
                });

                document.querySelectorAll('.overwrite-snapshot').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const snapshotId = btn.getAttribute('data-id');
                        this.modal.showConfirm('确定要覆盖此快照吗？', async () => {
                            try {
                                await registry.get('utils').deleteSnapshot(snapshotId, false);
                                await registry.get('utils').createSnapshot('manual', false);
                                registry.get('notificationService').show('快照覆盖成功', 'success');
                                setTimeout(() => this.show(), 500);
                            } catch (error) {
                                registry.get('notificationService').show('快照覆盖失败', 'error');
                            }
                        }, 'warning');
                    });
                });
            }
        });
    }
}
