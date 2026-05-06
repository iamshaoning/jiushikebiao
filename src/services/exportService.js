/**
 * 导出服务模块
 * 负责处理数据导出相关功能，包括导出旧课程数据、导出统计数据等
 */

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

class ExportService {
    constructor() {
        this.notificationService = null;
    }

    init(notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * 导出旧课程数据为HTML
     * @param {Array} oldCourses - 旧课程数据
     * @param {Object} state - 状态对象
     * @param {Object} utils - 工具函数
     */
    exportOldCoursesToHTML(oldCourses, state, utils) {
        const coursesByMonth = {};
        oldCourses.forEach(course => {
            const [year, month] = course.date.split('-').map(Number);
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            if (!coursesByMonth[key]) {
                coursesByMonth[key] = [];
            }
            coursesByMonth[key].push(course);
        });

        let htmlContent = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>旧课程数据导出</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;background-color:#f5f5f5;padding:20px}.container{max-width:1200px;margin:0 auto;background-color:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);padding:30px}h1{color:#1a56db;margin-bottom:30px;font-size:24px;text-align:center}.section{margin-bottom:40px;page-break-after:always}h2{color:#374151;margin-bottom:15px;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:8px}h3{color:#4b5563;margin-top:20px;margin-bottom:10px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed}th,td{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}th{background-color:#f9fafb;font-weight:600;color:#374151}.summary-label{font-weight:600;margin-right:10px}.summary-value{color:#1a56db}.summary-section{margin-bottom:20px;padding:15px;background-color:#f9fafb;border-radius:6px}.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:10px}.summary-item{display:flex;justify-content:space-between}</style></head><body><div class="container"><h1>旧课程数据导出</h1><div class="summary-section"><div class="summary-item"><span class="summary-label">导出时间</span><span class="summary-value">${new Date().toLocaleString('zh-CN')}</span></div><div class="summary-item"><span class="summary-label">总课程数</span><span class="summary-value">${oldCourses.length}</span></div><div class="summary-item"><span class="summary-label">涉及月份</span><span class="summary-value">${Object.keys(coursesByMonth).length} 个</span></div></div>`;

        Object.keys(coursesByMonth).sort().forEach(key => {
            const [year, month] = key.split('-').map(Number);
            const monthCourses = coursesByMonth[key];
            const monthName = MONTH_NAMES[month - 1];

            htmlContent += `<div class="section"><h2>${year}年${monthName}课程数据</h2><div class="summary-section"><div class="summary-item"><span class="summary-label">课程数量</span><span class="summary-value">${monthCourses.length}</span></div></div><h3>详细课程列表</h3><table><thead><tr><th>日期</th><th>时间</th><th>学生姓名</th><th>课型</th><th>课时费</th><th>所属机构</th><th>年级</th><th>备注</th></tr></thead><tbody>`;

            monthCourses.forEach(course => {
                const date = course.date;
                const endTime = utils.calculateEndTimeFromDuration(course.startTime, course.duration);
                const time = `${course.startTime}-${endTime}`;

                let students = '';
                let organization = '未知';
                let grade = '未知';

                if (course.studentIds) {
                    const studentList = course.studentIds.map(id => {
                        const student = state.students.find(s => s.id === id);
                        return student ? student.name : '未知学生';
                    });
                    students = studentList.join(', ');

                    const firstStudent = state.students.find(s => s.id === course.studentIds[0]);
                    if (firstStudent) {
                        organization = firstStudent.organization || '未分配';
                        grade = firstStudent.grade || '未设置';
                    }
                }

                const lessonType = course.lessonType || '未知';
                let fee = '0';

                if (course.fees && course.fees[0] !== undefined) {
                    fee = course.fees[0];
                }

                const note = course.note || '';

                htmlContent += `<tr><td>${date}</td><td>${time}</td><td>${students}</td><td>${lessonType}</td><td>${fee}</td><td>${organization}</td><td>${grade}</td><td>${note}</td></tr>`;
            });

            htmlContent += `</tbody></table></div>`;
        });

        htmlContent += `</div></body></html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `旧课程数据_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * 生成HTML内容（不直接下载）
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称
     * @param {Object} utils - 工具函数（可选）
     * @returns {string} HTML内容
     */
    generateHTMLContent(data, filename, year, month, organization, utils = null) {
        const monthName = MONTH_NAMES[month];
        const title = `${year}年${monthName}课时费统计`;

        let organizationData = [];
        let oneOnOneData = [];
        let groupData = [];
        let studentData = [];
        let currentSection = 'courses';

        data.forEach(row => {
            if (row.日期 === '机构详细数据') {
                currentSection = 'organization';
            } else if (row.日期 === '一对一分布数据') {
                currentSection = 'oneOnOne';
            } else if (row.日期 === '多人课分布数据') {
                currentSection = 'group';
            } else if (row.日期 === '学生课量数据') {
                currentSection = 'student';
            } else if (row.日期 && row.时间) {
                if (currentSection === 'organization') {
                    organizationData.push(row);
                } else if (currentSection === 'oneOnOne') {
                    oneOnOneData.push(row);
                } else if (currentSection === 'group') {
                    groupData.push(row);
                } else if (currentSection === 'student') {
                    studentData.push(row);
                }
            }
        });

        organizationData = organizationData.filter(row => row.日期 !== '机构' && row.时间 !== '课节数');
        oneOnOneData = oneOnOneData.filter(row => row.日期 !== '机构' && row.时间 !== '年级');
        groupData = groupData.filter(row => row.日期 !== '机构' && row.时间 !== '年级');
        studentData = studentData.filter(row => row.日期 !== '学生姓名' && row.时间 !== '所属机构');

        const orgNames = [...new Set(organizationData.map(r => r.日期).filter(Boolean))];
        const gradeNames = [...new Set([...oneOnOneData.map(r => r.时间), ...groupData.map(r => r.时间)].filter(Boolean))];
        const totalCourseCount = oneOnOneData.reduce((sum, r) => sum + (parseInt(r.所属机构) || 0), 0) + groupData.reduce((sum, r) => sum + (parseInt(r.所属机构) || 0), 0);
        const totalFee = organizationData.reduce((sum, r) => sum + (parseFloat(r.学生姓名) || 0), 0);
        const totalStudents = organizationData.reduce((sum, r) => sum + (parseInt(r.所属机构) || 0), 0);

        const validUtils = utils || (typeof window !== 'undefined' && window.utils);
        const getOrgBadge = (name) => {
            if (!name) return '';
            const color = validUtils?.generateColor ? validUtils.generateColor(name, 'organization') : '#3b82f6';
            return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;background:${color}20;color:${color};border:1px solid ${color}40">${name}</span>`;
        };
        const getGradeBadge = (name) => {
            if (!name) return '';
            const color = validUtils?.generateColor ? validUtils.generateColor(name, 'grade') : '#8b5cf6';
            return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;background:${color}20;color:${color};border:1px solid ${color}40">${name}</span>`;
        };
        const systemUrl = typeof window !== 'undefined' ? (window.location.origin || '课程管理系统') : '课程管理系统';

        let htmlContent = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;padding:40px;background-color:#f5f7fa}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:14px 20px;text-align:left;font-weight:600;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0}td{padding:14px 20px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155}tr:hover{background:#fafafa}.container{max-width:1200px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.08);overflow:hidden}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:24px 32px}.header h1{margin:0;font-size:24px;font-weight:600}.header p{margin:8px 0 0;opacity:0.9;font-size:14px}.stats{display:flex;gap:24px;padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.stat-item{text-align:center;flex:1}.stat-value{font-size:28px;font-weight:700;color:#1e293b}.stat-label{font-size:13px;color:#64748b;margin-top:4px}.section{padding:20px 32px}.section h2{color:#374151;margin-bottom:15px;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px}.section h3{color:#4b5563;margin-top:20px;margin-bottom:10px;font-size:16px}.empty{text-align:center;padding:40px;color:#6b7280;font-style:italic}.footer{padding:20px 32px;text-align:center;color:#94a3b8;font-size:13px;border-top:1px solid #e2e8f0}.footer a{color:#667eea;text-decoration:none}.footer a:hover{text-decoration:underline}</style></head><body><div class="container"><div class="header"><h1>${title}</h1><p>生成时间：${new Date().toLocaleString('zh-CN')}${organization ? ' | 机构：' + organization : ''}</p></div><div class="stats"><div class="stat-item"><div class="stat-value">${totalCourseCount}</div><div class="stat-label">总课节数</div></div><div class="stat-item"><div class="stat-value">¥${totalFee.toFixed(2)}</div><div class="stat-label">总课时费</div></div><div class="stat-item"><div class="stat-value">${totalStudents}</div><div class="stat-label">学生人数</div></div></div>`;

        htmlContent += `<div class="section"><h2>机构详细数据</h2>`;
        if (organizationData.length > 0) {
            htmlContent += `<table><thead><tr><th>机构</th><th>课节数</th><th>课时费</th><th>学生数</th><th>占比</th></tr></thead><tbody>`;
            organizationData.forEach(row => {
                htmlContent += `<tr><td>${getOrgBadge(row.日期 || '')}</td><td>${row.时间 || ''} 节</td><td>¥${row.学生姓名 || '0'}</td><td>${row.所属机构 || ''} 人</td><td>${row.年级 || ''}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        } else {
            htmlContent += `<div class="empty">暂无机构数据</div>`;
        }

        htmlContent += `</div><div class="section"><h2>机构课型数据</h2>`;
        if (oneOnOneData.length > 0) {
            htmlContent += `<h3>一对一分布数据</h3><table><thead><tr><th>机构</th><th>年级</th><th>学生数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            oneOnOneData.forEach(row => {
                htmlContent += `<tr><td>${getOrgBadge(row.日期 || '')}</td><td>${getGradeBadge(row.时间 || '')}</td><td>${row.学生姓名 || ''} 人</td><td>${row.所属机构 || ''} 节</td><td>¥${row.年级 || '0'}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        }
        if (groupData.length > 0) {
            htmlContent += `<h3>多人课分布数据</h3><table><thead><tr><th>机构</th><th>年级</th><th>上课人数</th><th>课节数</th><th>课时费</th></tr></thead><tbody>`;
            groupData.forEach(row => {
                htmlContent += `<tr><td>${getOrgBadge(row.日期 || '')}</td><td>${getGradeBadge(row.时间 || '')}</td><td>${row.学生姓名 || ''} 人</td><td>${row.所属机构 || ''} 节</td><td>¥${row.年级 || '0'}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        }

        htmlContent += `</div><div class="section"><h2>学生课量数据</h2>`;
        if (studentData.length > 0) {
            htmlContent += `<table><thead><tr><th>学生姓名</th><th>所属机构</th><th>年级</th><th>上课节数</th><th>课时费</th></tr></thead><tbody>`;
            studentData.forEach(row => {
                htmlContent += `<tr><td>${row.日期 || ''}</td><td>${getOrgBadge(row.时间 || '')}</td><td>${getGradeBadge(row.学生姓名 || '')}</td><td>${row.所属机构 || ''} 节</td><td>¥${row.年级 || '0'}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        } else {
            htmlContent += `<div class="empty">暂无学生课量数据</div>`;
        }

        htmlContent += `</div><div class="footer">报告生成于 <a href="${systemUrl}" target="_blank">课程管理系统</a></div></div></body></html>`;

        return htmlContent;
    }

    /**
     * 导出统计数据为HTML
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称
     */
    exportHTML(data, filename, year, month, organization) {
        const utils = typeof window !== 'undefined' && window.utils;
        const htmlContent = this.generateHTMLContent(data, filename, year, month, organization, utils);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * 导出统计数据为PDF
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称
     * @param {string} orientation - 页面方向：'portrait' 或 'landscape'
     */
    /**
     * 导出统计数据
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {string} organization - 机构名称
     */
    exportStatisticsData(year, month, organization = '') {
        const state = window.state;
        const utils = window.utils;
        const notificationService = this.notificationService || window.notificationService;

        const filteredCourses = state.courses.filter(course => {
            const courseDate = new Date(course.date);
            return courseDate.getFullYear() === year && courseDate.getMonth() === month;
        });

        const exportData = [];

        const organizationStats = {};
        const studentStats = {};
        const detailedStats = {
            '一对一': {},
            '多人课': {}
        };

        filteredCourses.forEach(course => {
            const courseLessonType = course.lessonType || '一对一';
            const isGroupLesson = courseLessonType === '多人课';

            const endTime = utils.calculateEndTimeFromDuration(course.startTime, course.duration);
            const groupFee = isGroupLesson ? (course.fees && course.fees[0] !== undefined ? course.fees[0] : 0) : 0;
            const studentCount = course.studentIds && Array.isArray(course.studentIds) ? course.studentIds.length : 1;
            const safeStudentCount = Math.max(1, studentCount);
            const perStudentFee = isGroupLesson ? Math.round((groupFee / safeStudentCount) * 100) / 100 : 0;

            const processStudent = (studentId, index) => {
                const student = state.students.find(s => s.id === studentId);
                if (!student) return;

                if (organization && student.organization !== organization) {
                    return;
                }

                const studentFee = isGroupLesson ? perStudentFee : (window.utils?.getCourseFee ? window.utils.getCourseFee(course, student, index) : (course.fees && course.fees[index] !== undefined ? course.fees[index] : (student?.fees?.['一对一'] || 0)));

                exportData.push({
                    日期: course.date,
                    时间: `${course.startTime} - ${endTime}`,
                    学生姓名: student.name,
                    所属机构: student.organization,
                    年级: student.grade || '未设置',
                    课型: courseLessonType,
                    上课人数: studentCount,
                    课时费: isGroupLesson ? groupFee : studentFee,
                    备注: course.note || ''
                });

                const org = student.organization || '未分配';
                if (!organizationStats[org]) {
                    organizationStats[org] = {
                        courses: 0,
                        fee: 0,
                        students: new Set()
                    };
                }
                organizationStats[org].students.add(studentId);

                const shouldCountCourse = isGroupLesson ? index === 0 : true;
                if (shouldCountCourse) {
                    organizationStats[org].courses += 1;
                    organizationStats[org].fee += isGroupLesson ? groupFee : studentFee;
                }

                if (courseLessonType === '一对一') {
                    const grade = student.grade || '未设置';
                    if (!detailedStats['一对一'][grade]) {
                        detailedStats['一对一'][grade] = {};
                    }
                    if (!detailedStats['一对一'][grade][org]) {
                        detailedStats['一对一'][grade][org] = {
                            courses: 0,
                            fee: 0,
                            students: new Set()
                        };
                    }
                    detailedStats['一对一'][grade][org].courses += 1;
                    detailedStats['一对一'][grade][org].fee += studentFee;
                    detailedStats['一对一'][grade][org].students.add(studentId);
                } else if (courseLessonType === '多人课') {
                    const grade = student.grade || '未设置';
                    if (!detailedStats['多人课'][studentCount]) {
                        detailedStats['多人课'][studentCount] = {};
                    }
                    if (!detailedStats['多人课'][studentCount][grade]) {
                        detailedStats['多人课'][studentCount][grade] = {};
                    }
                    if (!detailedStats['多人课'][studentCount][grade][org]) {
                        detailedStats['多人课'][studentCount][grade][org] = {
                            courses: 0,
                            fee: 0,
                            students: new Set()
                        };
                    }
                    if (index === 0) {
                        detailedStats['多人课'][studentCount][grade][org].courses += 1;
                        detailedStats['多人课'][studentCount][grade][org].fee += groupFee;
                    }
                    detailedStats['多人课'][studentCount][grade][org].students.add(studentId);
                }

                if (!studentStats[studentId]) {
                    studentStats[studentId] = {
                        courses: 0,
                        fee: 0
                    };
                }
                studentStats[studentId].courses += 1;
                studentStats[studentId].fee += studentFee;
            };

            if (course.studentIds && Array.isArray(course.studentIds)) {
                course.studentIds.forEach((studentId, index) => processStudent(studentId, index));
            }
        });

        exportData.push({});
        exportData.push({ 日期: '机构详细数据' });
        exportData.push({ 日期: '机构', 时间: '课节数', 学生姓名: '课时费', 所属机构: '学生数', 年级: '占比' });

        const totalCourses = Object.values(organizationStats).reduce((sum, stats) => sum + stats.courses, 0);
        Object.entries(organizationStats).sort(([,a], [,b]) => b.courses - a.courses).forEach(([org, stats]) => {
            const pct = totalCourses > 0 ? (stats.courses / totalCourses * 100) : 0;
            exportData.push({
                日期: org,
                时间: stats.courses,
                学生姓名: stats.fee.toFixed(2),
                所属机构: stats.students.size,
                年级: pct.toFixed(1) + '%'
            });
        });

        exportData.push({});
        exportData.push({ 日期: '机构课型数据' });
        exportData.push({});

        exportData.push({ 日期: '一对一分布数据' });
        exportData.push({ 日期: '机构', 时间: '年级', 学生姓名: '学生数', 所属机构: '课节数', 年级: '课时费' });

        const orgGradeStats = {};
        Object.entries(detailedStats['一对一']).forEach(([grade, orgStats]) => {
            Object.entries(orgStats).forEach(([org, stats]) => {
                if (!orgGradeStats[org]) {
                    orgGradeStats[org] = {};
                }
                orgGradeStats[org][grade] = stats;
            });
        });

        Object.entries(orgGradeStats).sort(([orgA], [orgB]) => orgA.localeCompare(orgB)).forEach(([org, gradeStats]) => {
            Object.entries(gradeStats).forEach(([grade, stats]) => {
                exportData.push({
                    日期: org,
                    时间: grade,
                    学生姓名: stats.students.size,
                    所属机构: stats.courses,
                    年级: stats.fee.toFixed(2)
                });
            });
        });

        exportData.push({});

        exportData.push({ 日期: '多人课分布数据' });
        exportData.push({ 日期: '机构', 时间: '年级', 学生姓名: '上课人数', 所属机构: '课节数', 年级: '课时费' });

        const orgGradeCountStats = {};
        Object.entries(detailedStats['多人课']).forEach(([studentCount, gradeStats]) => {
            Object.entries(gradeStats).forEach(([grade, orgStats]) => {
                Object.entries(orgStats).forEach(([org, stats]) => {
                    if (!orgGradeCountStats[org]) {
                        orgGradeCountStats[org] = {};
                    }
                    if (!orgGradeCountStats[org][grade]) {
                        orgGradeCountStats[org][grade] = {};
                    }
                    orgGradeCountStats[org][grade][studentCount] = stats;
                });
            });
        });

        Object.entries(orgGradeCountStats).sort(([orgA], [orgB]) => orgA.localeCompare(orgB)).forEach(([org, gradeStats]) => {
            Object.entries(gradeStats).forEach(([grade, countStats]) => {
                Object.entries(countStats).sort(([countA], [countB]) => parseInt(countA) - parseInt(countB)).forEach(([studentCount, stats]) => {
                    exportData.push({
                        日期: org,
                        时间: grade,
                        学生姓名: studentCount,
                        所属机构: stats.courses,
                        年级: stats.fee.toFixed(2)
                    });
                });
            });
        });

        exportData.push({});
        exportData.push({ 日期: '学生课量数据' });
        exportData.push({ 日期: '学生姓名', 时间: '所属机构', 学生姓名: '年级', 所属机构: '上课节数', 年级: '课时费' });

        const sortedStudents = Object.entries(studentStats)
            .map(([studentId, stats]) => {
                const student = state.students.find(s => s.id === studentId);
                return {
                    id: studentId,
                    name: student ? student.name : '未知学生',
                    organization: student ? student.organization : '未分配',
                    grade: student ? student.grade : '未设置',
                    courses: stats.courses,
                    fee: stats.fee
                };
            })
            .sort((a, b) => b.courses - a.courses);

        sortedStudents.forEach(student => {
            exportData.push({
                日期: student.name,
                时间: student.organization,
                学生姓名: student.grade,
                所属机构: student.courses,
                年级: student.fee.toFixed(2)
            });
        });

        if (exportData.length > 0) {
            const monthName = MONTH_NAMES[month];
            const htmlFilename = `${year}年${monthName}课时费统计.html`;
            this.exportHTML(exportData, htmlFilename, year, month, organization);
            
            if (notificationService) {
                notificationService.show('数据导出成功', 'success');
            }
        } else {
            if (notificationService) {
                notificationService.show('暂无数据可导出', 'warning');
            }
        }
    }

}

const exportService = new ExportService();
export default exportService;