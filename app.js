// === DAY.JS PLUGIN REGISTRATION (must be before app() definition) ===
// Wait for Day.js plugins to load (they're loaded from CDN)
if (typeof dayjs_plugin_isoWeek !== 'undefined') {
  dayjs.extend(dayjs_plugin_isoWeek);
}
if (typeof dayjs_plugin_weekOfYear !== 'undefined') {
  dayjs.extend(dayjs_plugin_weekOfYear);
}

// === DEXIE.JS INITIALIZATION ===
const db = new Dexie('WeeklyStaffDB');
db.version(1).stores({
  members:     '++id, name, department, grade, status',
  projects:    '++id, name, year, sortOrder',
  assignments: '++id, [memberId+projectId], memberId, projectId',
  events:      '++id, memberId, type, date'
});

// === ALPINE.JS APP ===
function app() {
  return {
    // ========== STATE ==========
    currentYear: new Date().getFullYear(),

    // Projects with members loaded
    projects: [],
    allMembers: [],
    expandedProjects: {},

    // Drag state
    drag: {
      active: false,
      rowType: null,     // 'project' | 'member'
      rowId: null,       // projectId or 'projectId-memberId'
      startWeek: null,   // week index 0-51
      endWeek: null,
      mode: 'fill'       // 'fill' | 'erase'
    },

    // Filters
    filterTask: '',
    filterMemberId: '',

    // Right panel
    selectedMember: null,
    memberAssignmentHistory: [],
    memberEvents: [],

    // Modals
    showAddProjectModal: false,
    showAddMemberModal: false,
    showCreateMemberModal: false,
    showLogEventModal: false,
    showManageMembersModal: false,
    addMemberTargetProjectId: null,
    logEventTargetMemberId: null,
    editingMemberId: null,

    // Form data
    newProject: { name: '', color: '#3b82f6' },
    newMember: { memberId: null },
    createMember: { name: '', task: '', years: '' },
    editMemberForm: { name: '', task: '', years: '' },
    logEventForm: { type: '전배', date: dayjs().format('YYYY-MM-DD'), note: '', score: null },

    // ========== INITIALIZATION ==========
    async init() {
      appInstance = this;
      await this.loadTimeline();
    },

    get weekHeaders() {
      const jan4 = dayjs(`${this.currentYear}-01-04`);
      const firstMonday = jan4.startOf('week');
      return Array.from({ length: 52 }, (_, i) => {
        const monday = firstMonday.add(i, 'week');
        const friday = monday.add(4, 'day');
        return {
          num: `W${String(i + 1).padStart(2, '0')}`,
          start: monday.format('MM/DD'),
          end: friday.format('MM/DD')
        };
      });
    },

    get currentWeekKey() {
      const now = dayjs();
      const year = now.year();
      const jan4 = dayjs(`${year}-01-04`);
      const firstMonday = jan4.startOf('week');
      const diffWeeks = now.startOf('week').diff(firstMonday, 'week') + 1;
      return `${year}-W${String(diffWeeks).padStart(2, '0')}`;
    },

    isMemberActiveNow(projectId, memberId) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return false;
      const member = project.members.find(m => m.id === memberId);
      if (!member) return false;
      return member.weeks.has(this.currentWeekKey);
    },

    async loadTimeline() {
      try {
        const projects = await db.projects.where('year').equals(this.currentYear).toArray();
        const assignments = await db.assignments.toArray();
        const rawMembers = await db.members.toArray();
        const members = rawMembers.map(m => ({
          ...m,
          task: m.task ?? m.department ?? '',
          years: m.years ?? m.grade ?? ''
        }));

        this.allMembers = members;
        const today = dayjs().format('YYYY-MM-DD');

        // Build projects with members
        const newProjects = projects.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(project => {
          const projectAssignments = assignments.filter(a => a.projectId === project.id);
          const projectMembers = projectAssignments.map(assign => {
            const member = members.find(m => m.id === assign.memberId);
            const weeks = new Set(assign.weeks || []);

            // Calculate active project count for today (current date)
            const activeProjectCount = assignments.filter(a => a.memberId === assign.memberId)
              .filter(a => {
                const projAssign = assignments.find(x => x.id === a.id);
                return projAssign && projAssign.weeks.some(w => this.isWeekInCurrentDate(w));
              }).length;

            // Calculate start and end dates
            const dateRange = this.calculateDateRange(weeks);

            return {
              ...member,
              assignmentId: assign.id,
              memo: assign.memo || '',
              weeks: weeks,
              activeProjectCount: activeProjectCount,
              startDate: dateRange.start,
              endDate: dateRange.end
            };
          });

          return {
            ...project,
            members: projectMembers,
            weeks: new Set(project.weeks || []),
            weekMemos: project.weekMemos || {}
          };
        });

        // Force Alpine reactivity by replacing the entire array
        this.projects = [];
        await new Promise(r => setTimeout(r, 0));
        this.projects = newProjects;
      } catch (err) {
        console.error('Error loading timeline:', err);
      }
    },

    isWeekInCurrentDate(weekKey) {
      // Check if current date falls within the given ISO week (Mon-Fri)
      const today = dayjs();
      try {
        // Parse YYYY-WXX format
        const match = weekKey.match(/(\d{4})-W(\d{2})/);
        if (!match) return false;
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);

        // Calculate the Monday of the given week
        const jan4 = dayjs(`${year}-01-04`, 'YYYY-MM-DD');
        const weekStart = jan4.startOf('week').add(week - 1, 'week');
        const weekEnd = weekStart.add(4, 'day'); // Friday

        return today.isSameOrAfter(weekStart) && today.isSameOrBefore(weekEnd);
      } catch (err) {
        return false;
      }
    },

    calculateDateRange(weeks) {
      if (!weeks || weeks.size === 0) return { start: '-', end: '-' };

      try {
        const sortedWeeks = Array.from(weeks).sort();
        const firstWeek = sortedWeeks[0];
        const lastWeek = sortedWeeks[sortedWeeks.length - 1];

        // Parse first week (Monday)
        const firstMatch = firstWeek.match(/(\d{4})-W(\d{2})/);
        const firstYear = parseInt(firstMatch[1]);
        const firstWk = parseInt(firstMatch[2]);
        const firstJan4 = dayjs(`${firstYear}-01-04`, 'YYYY-MM-DD');
        const firstMonday = firstJan4.startOf('week').add(firstWk - 1, 'week').format('YYYY-MM-DD');

        // Parse last week (Friday)
        const lastMatch = lastWeek.match(/(\d{4})-W(\d{2})/);
        const lastYear = parseInt(lastMatch[1]);
        const lastWk = parseInt(lastMatch[2]);
        const lastJan4 = dayjs(`${lastYear}-01-04`, 'YYYY-MM-DD');
        const lastFriday = lastJan4.startOf('week').add(lastWk - 1, 'week').add(4, 'day').format('YYYY-MM-DD');

        return { start: firstMonday, end: lastFriday };
      } catch (err) {
        return { start: '-', end: '-' };
      }
    },

    // ========== WEEK INDEX ↔ WEEK KEY CONVERSION ==========
    weekIdxToKey(idx) {
      // Fallback: year-W01 to year-W52 (simple sequential numbering)
      return `${this.currentYear}-W${String(idx + 1).padStart(2, '0')}`;
    },

    weekKeyToIdx(weekKey) {
      // Parse YYYY-WXX format directly
      const match = weekKey.match(/\d+-W(\d+)/);
      return match ? parseInt(match[1]) - 1 : 0;
    },

    // ========== PROJECT ACTIONS ==========
    async addProject() {
      if (!this.newProject.name.trim()) return;

      const maxOrder = this.projects.length > 0
        ? Math.max(...this.projects.map(p => p.sortOrder || 0))
        : 0;

      await db.projects.add({
        name: this.newProject.name,
        year: this.currentYear,
        color: this.newProject.color,
        sortOrder: maxOrder + 1
      });

      this.newProject = { name: '', color: '#3b82f6' };
      this.showAddProjectModal = false;
      await this.loadTimeline();
    },

    async deleteProject(projectId) {
      const project = this.projects.find(p => p.id === projectId);
      const label = project ? project.name : '이 프로젝트';
      if (!confirm(`"${label}" 프로젝트를 삭제합니다.\n이 프로젝트의 모든 구성원 배정도 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
      await db.assignments.where('projectId').equals(projectId).delete();
      await db.projects.delete(projectId);
      const next = { ...this.expandedProjects };
      delete next[projectId];
      this.expandedProjects = next;
      await this.loadTimeline();
    },

    toggleProject(projectId) {
      this.expandedProjects = {
        ...this.expandedProjects,
        [projectId]: !this.expandedProjects[projectId]
      };
    },

    isExpanded(projectId) {
      return !!this.expandedProjects[projectId];
    },

    get uniqueTasks() {
      return [...new Set(this.allMembers.map(m => m.task))].filter(Boolean).sort();
    },

    get visibleProjects() {
      const memId = this.filterMemberId ? parseInt(this.filterMemberId) : null;
      const task = this.filterTask;
      if (!memId && !task) return this.projects;
      return this.projects
        .map(p => ({
          ...p,
          members: p.members.filter(m => {
            if (memId && m.id !== memId) return false;
            if (task && m.task !== task) return false;
            return true;
          })
        }))
        .filter(p => p.members.length > 0);
    },

    // ========== MEMBER ACTIONS ==========
    async addMemberToProject() {
      if (!this.newMember.memberId || !this.addMemberTargetProjectId) return;

      const memberId = parseInt(this.newMember.memberId);
      const projectId = parseInt(this.addMemberTargetProjectId);

      const existing = await db.assignments.where('[memberId+projectId]')
        .equals([memberId, projectId])
        .first();

      if (!existing) {
        await db.assignments.add({
          memberId: memberId,
          projectId: projectId,
          weeks: [],
          memo: ''
        });
      }

      this.expandedProjects = { ...this.expandedProjects, [projectId]: true };
      this.newMember = { memberId: null };
      this.addMemberTargetProjectId = null;
      this.showAddMemberModal = false;
      await this.loadTimeline();
    },

    async createNewMember() {
      if (!this.createMember.name.trim()) return;

      const memberId = await db.members.add({
        name: this.createMember.name.trim(),
        task: this.createMember.task.trim(),
        years: this.createMember.years.trim(),
        status: 'active',
        skills: []
      });

      // Optionally add to the target project if one was selected
      if (this.addMemberTargetProjectId) {
        await db.assignments.add({
          memberId,
          projectId: this.addMemberTargetProjectId,
          weeks: [],
          memo: ''
        });
        this.expandedProjects = { ...this.expandedProjects, [this.addMemberTargetProjectId]: true };
      }

      this.createMember = { name: '', task: '', years: '' };
      this.showCreateMemberModal = false;
      this.addMemberTargetProjectId = null;
      await this.loadTimeline();
    },

    beginEditMember(member) {
      this.editingMemberId = member.id;
      this.editMemberForm = {
        name: member.name || '',
        task: member.task || '',
        years: member.years || ''
      };
    },

    cancelEditMember() {
      this.editingMemberId = null;
      this.editMemberForm = { name: '', task: '', years: '' };
    },

    async saveEditMember() {
      if (!this.editingMemberId) return;
      if (!this.editMemberForm.name.trim()) return;
      await db.members.update(this.editingMemberId, {
        name: this.editMemberForm.name.trim(),
        task: this.editMemberForm.task.trim(),
        years: this.editMemberForm.years.trim()
      });
      this.editingMemberId = null;
      await this.loadTimeline();
      if (this.selectedMember) {
        await this.selectMember(this.selectedMember.id);
      }
    },

    async deleteMember(memberId) {
      const member = this.allMembers.find(m => m.id === memberId);
      const label = member ? member.name : '이 구성원';
      if (!confirm(`${label} 구성원을 삭제합니다.\n관련된 모든 프로젝트 배정과 이벤트도 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
      await db.assignments.where('memberId').equals(memberId).delete();
      await db.events.where('memberId').equals(memberId).delete();
      await db.members.delete(memberId);
      if (this.selectedMember?.id === memberId) this.selectedMember = null;
      this.editingMemberId = null;
      await this.loadTimeline();
    },

    // ========== MEMBER DRAG-AND-DROP (reassign / copy across projects) ==========
    dropHoverProjectId: null,

    onMemberDragStart(evt, projectId, memberId, assignmentId) {
      const payload = JSON.stringify({ projectId, memberId, assignmentId });
      evt.dataTransfer.effectAllowed = 'copyMove';
      evt.dataTransfer.setData('application/x-member-assignment', payload);
      evt.dataTransfer.setData('text/plain', payload);
    },

    onProjectDragOver(evt, projectId) {
      evt.preventDefault();
      evt.dataTransfer.dropEffect = evt.ctrlKey || evt.metaKey ? 'copy' : 'move';
      this.dropHoverProjectId = projectId;
    },

    onProjectDragLeave(projectId) {
      if (this.dropHoverProjectId === projectId) this.dropHoverProjectId = null;
    },

    async onMemberDrop(evt, targetProjectId) {
      evt.preventDefault();
      this.dropHoverProjectId = null;
      const raw = evt.dataTransfer.getData('application/x-member-assignment')
                  || evt.dataTransfer.getData('text/plain');
      if (!raw) return;
      let payload;
      try { payload = JSON.parse(raw); } catch { return; }
      const { projectId: srcProjectId, memberId, assignmentId } = payload;
      if (!assignmentId || !memberId || srcProjectId === targetProjectId) return;

      const copy = evt.ctrlKey || evt.metaKey;
      const srcAssign = await db.assignments.get(assignmentId);
      if (!srcAssign) return;

      const existing = await db.assignments
        .where('[memberId+projectId]').equals([memberId, targetProjectId]).first();

      if (existing) {
        const mergedWeeks = [...new Set([...(existing.weeks || []), ...(srcAssign.weeks || [])])];
        const mergedMemo = [existing.memo, srcAssign.memo].filter(Boolean).join(' / ');
        await db.assignments.update(existing.id, { weeks: mergedWeeks, memo: mergedMemo });
        if (!copy) await db.assignments.delete(assignmentId);
      } else if (copy) {
        await db.assignments.add({
          memberId,
          projectId: targetProjectId,
          weeks: [...(srcAssign.weeks || [])],
          memo: srcAssign.memo || ''
        });
      } else {
        await db.assignments.update(assignmentId, { projectId: targetProjectId });
      }
      this.expandedProjects = { ...this.expandedProjects, [targetProjectId]: true };
      await this.loadTimeline();
    },

    async updateMemo(assignmentId, value) {
      await db.assignments.update(assignmentId, { memo: value });
      for (const project of this.projects) {
        const m = project.members.find(mm => mm.assignmentId === assignmentId);
        if (m) { m.memo = value; break; }
      }
    },

    async selectMember(memberId) {
      const member = this.allMembers.find(m => m.id === memberId);
      if (!member) return;

      this.selectedMember = member;

      // Load assignment history across all years and projects
      const assignments = await db.assignments.where('memberId').equals(memberId).toArray();
      const projects = await db.projects.toArray();

      this.memberAssignmentHistory = assignments.map(assign => {
        const project = projects.find(p => p.id === assign.projectId);
        return {
          ...assign,
          projectName: project?.name || '(삭제된 프로젝트)',
        };
      });

      // Load events
      this.memberEvents = await db.events.where('memberId').equals(memberId).reverse().toArray();
    },

    openLogEventModal(memberId) {
      this.logEventTargetMemberId = memberId;
      this.showLogEventModal = true;
      this.logEventForm = { type: '전배', date: this.getTodayDate(), note: '', score: null };
    },

    async logEvent() {
      if (!this.logEventTargetMemberId) return;

      await db.events.add({
        memberId: this.logEventTargetMemberId,
        type: this.logEventForm.type,
        date: this.logEventForm.date,
        note: this.logEventForm.note,
        score: this.logEventForm.score,
        fromProject: null,
        toProject: null
      });

      this.showLogEventModal = false;
      await this.selectMember(this.logEventTargetMemberId);
    },

    // ========== DRAG LOGIC ==========
    _pendingSingleApply: null,

    startDrag(rowType, rowId, weekIdx) {
      if (this._pendingSingleApply) {
        clearTimeout(this._pendingSingleApply);
        this._pendingSingleApply = null;
      }
      this.drag.active = true;
      this.drag.rowType = rowType;
      this.drag.rowId = rowId;
      this.drag.startWeek = weekIdx;
      this.drag.endWeek = weekIdx;

      // Determine mode based on current cell state
      if (rowType === 'project') {
        this.drag.mode = this.isProjectWeekFilled(rowId, weekIdx) ? 'erase' : 'fill';
      } else {
        const [projId, memberId] = rowId.split('-');
        this.drag.mode = this.isMemberWeekFilled(projId, memberId, weekIdx) ? 'erase' : 'fill';
      }

      document.addEventListener('mouseup', () => this.endDrag(), { once: true });
    },

    updateDragPreview(rowType, rowId, weekIdx) {
      if (!this.drag.active || this.drag.rowType !== rowType || this.drag.rowId !== rowId) return;
      this.drag.endWeek = weekIdx;
    },

    async endDrag() {
      if (!this.drag.active) return;

      const [start, end] = [
        Math.min(this.drag.startWeek, this.drag.endWeek),
        Math.max(this.drag.startWeek, this.drag.endWeek)
      ];

      const rowType = this.drag.rowType;
      const rowId = this.drag.rowId;
      const mode = this.drag.mode;
      this.drag.active = false;

      // For project rows, single-cell click is delayed so a dblclick can cancel it
      if (rowType === 'project' && start === end) {
        this._pendingSingleApply = setTimeout(async () => {
          this._pendingSingleApply = null;
          await this.applyDragRange(rowId, start, end, mode);
        }, 250);
        return;
      }
      await this.applyDragRange(rowId, start, end, mode);
    },

    async editProjectWeekMemo(projectId, weekIdx) {
      if (this._pendingSingleApply) {
        clearTimeout(this._pendingSingleApply);
        this._pendingSingleApply = null;
      }
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return;
      const weekKey = this.weekIdxToKey(weekIdx);
      const existing = project.weekMemos?.[weekKey] || '';
      const value = prompt(`${project.name} · ${weekKey} 메모`, existing);
      if (value === null) return;
      const memos = { ...(project.weekMemos || {}) };
      if (value.trim()) memos[weekKey] = value.trim();
      else delete memos[weekKey];
      await db.projects.update(projectId, { weekMemos: memos });
      await this.loadTimeline();
    },

    getProjectWeekMemo(projectId, weekIdx) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project || !project.weekMemos) return '';
      return project.weekMemos[this.weekIdxToKey(weekIdx)] || '';
    },

    async applyDragRange(rowId, startIdx, endIdx, mode) {
      const weekKeys = [];
      for (let i = startIdx; i <= endIdx; i++) {
        weekKeys.push(this.weekIdxToKey(i));
      }

      if (this.drag.rowType === 'project') {
        const project = this.projects.find(p => p.id === rowId);
        if (!project) return;

        if (mode === 'fill') {
          weekKeys.forEach(w => project.weeks.add(w));
        } else {
          weekKeys.forEach(w => project.weeks.delete(w));
        }

        await db.projects.update(project.id, {
          weeks: Array.from(project.weeks)
        });
        await this.loadTimeline();
      } else {
        // Update member weeks within project
        const [projId, memberId] = rowId.split('-');
        const project = this.projects.find(p => p.id === parseInt(projId));
        const member = project?.members.find(m => m.id === parseInt(memberId));
        if (!member) return;

        if (mode === 'fill') {
          weekKeys.forEach(w => member.weeks.add(w));
        } else {
          weekKeys.forEach(w => member.weeks.delete(w));
        }

        // Update DB
        await db.assignments.update(member.assignmentId, {
          weeks: Array.from(member.weeks)
        });
        await this.loadTimeline();
      }
    },

    isProjectWeekFilled(projectId, weekIdx) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return false;
      const weekKey = this.weekIdxToKey(weekIdx);
      return project.weeks.has(weekKey);
    },

    isMemberWeekFilled(projectId, memberId, weekIdx) {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return false;
      const member = project.members.find(m => m.id === memberId);
      if (!member) return false;
      const weekKey = this.weekIdxToKey(weekIdx);
      return member.weeks.has(weekKey);
    },

    isProjectCellInDragPreview(projectId, weekIdx) {
      if (!this.drag.active || this.drag.rowType !== 'project' || this.drag.rowId !== projectId) return false;
      const [s, e] = [
        Math.min(this.drag.startWeek, this.drag.endWeek),
        Math.max(this.drag.startWeek, this.drag.endWeek)
      ];
      return weekIdx >= s && weekIdx <= e;
    },

    isMemberCellInDragPreview(projectId, memberId, weekIdx) {
      const rowId = `${projectId}-${memberId}`;
      if (!this.drag.active || this.drag.rowType !== 'member' || this.drag.rowId !== rowId) return false;
      const [s, e] = [
        Math.min(this.drag.startWeek, this.drag.endWeek),
        Math.max(this.drag.startWeek, this.drag.endWeek)
      ];
      return weekIdx >= s && weekIdx <= e;
    },

    // ========== YEAR NAVIGATION ==========
    prevYear() {
      this.currentYear--;
      this.loadTimeline();
    },

    nextYear() {
      this.currentYear++;
      this.loadTimeline();
    },

    // ========== IMPORT / EXPORT ==========
    async exportJSON() {
      const [members, projects, assignments, events] = await Promise.all([
        db.members.toArray(),
        db.projects.toArray(),
        db.assignments.toArray(),
        db.events.toArray()
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        members,
        projects,
        assignments,
        events
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `weekly-staff-export-${dayjs().format('YYYY-MM-DD')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    importJSON() {
      document.getElementById('import-file').click();
    },

    async handleFileImport(event) {
      const file = event.target.files[0];
      if (!file) return;

      const text = await file.text();
      const payload = JSON.parse(text);

      const confirmed = confirm(
        `이 작업은 모든 데이터를 초기화하고 가져온 데이터로 덮어씁니다.\n계속하시겠습니까?`
      );
      if (!confirmed) return;

      await db.transaction('rw', db.members, db.projects, db.assignments, db.events, async () => {
        await db.members.clear();
        await db.projects.clear();
        await db.assignments.clear();
        await db.events.clear();

        if (payload.members?.length) await db.members.bulkAdd(payload.members);
        if (payload.projects?.length) await db.projects.bulkAdd(payload.projects);
        if (payload.assignments?.length) await db.assignments.bulkAdd(payload.assignments);
        if (payload.events?.length) await db.events.bulkAdd(payload.events);
      });

      await this.loadTimeline();
      document.getElementById('import-file').value = '';
    },

    // ========== UTILITIES ==========
    getTodayDate() {
      return dayjs().format('YYYY-MM-DD');
    },

    formatWeekRange(weeks) {
      if (!weeks || weeks.size === 0) return '(배정 없음)';
      const sorted = Array.from(weeks).sort();
      return sorted.join(', ');
    }
  };
}

// === GLOBAL APP REFERENCE ===
let appInstance = null;

// === SEED DATA IMPORT HELPER ===
window.importSeedData = async function(seedJSON) {
  const payload = typeof seedJSON === 'string' ? JSON.parse(seedJSON) : seedJSON;

  await db.transaction('rw', db.members, db.projects, db.assignments, db.events, async () => {
    if (payload.members?.length) await db.members.bulkAdd(payload.members);
    if (payload.projects?.length) await db.projects.bulkAdd(payload.projects);
    if (payload.assignments?.length) await db.assignments.bulkAdd(payload.assignments);
    if (payload.events?.length) await db.events.bulkAdd(payload.events);
  });

  // Reload timeline in app instance if available
  if (appInstance && appInstance.loadTimeline) {
    await appInstance.loadTimeline();
    console.log('✓ Seed data imported and timeline reloaded');
  } else {
    console.log('✓ Seed data imported. Reload the page to see changes.');
  }
};
