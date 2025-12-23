(() => {
  "use strict";

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const SLOTS = [
    { label: "Lecture 1", type: "lecture" },
    { label: "Lecture 2", type: "lecture" },
    { label: "Lecture 3", type: "lecture" },
    { label: "Lecture 4", type: "lecture" },
    { label: "Lunch Break", type: "lunch" },
    { label: "Lecture 5", type: "lecture" },
    { label: "Lecture 6", type: "lecture" },
  ];
  const LECTURE_SLOTS_PER_DAY = SLOTS.filter((s) => s.type === "lecture").length;
  const TOTAL_LECTURES_PER_WEEK = DAYS.length * LECTURE_SLOTS_PER_DAY;

  let teachers = [];
  let timetable = {};
  let timetableGenerated = false;

  const teacherNameInput = document.getElementById("teacherName");
  const subjectInput = document.getElementById("subject");
  const classTypeSelect = document.getElementById("classType");
  const classesPerWeekInput = document.getElementById("classesPerWeek");
  const teacherListEl = document.getElementById("teacherList");
  const teacherMessageEl = document.getElementById("teacherMessage");
  const timetableMessageEl = document.getElementById("timetableMessage");
  const timetableTableEl = document.getElementById("timetableTable");
  const addTeacherBtn = document.getElementById("addTeacherBtn");
  const clearTeachersBtn = document.getElementById("clearTeachersBtn");
  const generateBtn = document.getElementById("generateBtn");
  const csvBtn = document.getElementById("csvBtn");
  const pdfBtn = document.getElementById("pdfBtn");

  const setMessage = (el, text, type) => {
    el.className = "notice " + type;
    el.textContent = text;
  };

  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const csvEscape = (value) => {
    if (value == null) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };

  function renderTeacherList() {
    teacherListEl.innerHTML = "";
    if (!teachers.length) {
      teacherListEl.textContent = "No teachers added yet.";
      return;
    }
    teachers.forEach((t, idx) => {
      const item = document.createElement("div");
      item.className = "teacher-item";
      const info = document.createElement("div");
      info.innerHTML = `<div>${t.name}</div><div class="teacher-meta">${t.subject} • ${t.classType}</div>`;
      const meta = document.createElement("div");
      meta.className = "teacher-meta";
      meta.textContent = `${t.classesPerWeek} / wk`;
      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.type = "button";
      remove.addEventListener("click", () => {
        teachers.splice(idx, 1);
        renderTeacherList();
        timetableGenerated = false;
        csvBtn.disabled = true;
        pdfBtn.disabled = true;
        setMessage(teacherMessageEl, "Teacher removed.", "info");
        setMessage(timetableMessageEl, "Timetable outdated. Generate again.", "info");
      });
      item.append(info, meta, remove);
      teacherListEl.appendChild(item);
    });
    const total = teachers.reduce((s, t) => s + t.classesPerWeek, 0);
    setMessage(
      teacherMessageEl,
      `Total teachers: ${teachers.length}. Total classes/week: ${total} (need at least ${TOTAL_LECTURES_PER_WEEK}).`,
      "info"
    );
  }

  function addTeacher() {
    const name = teacherNameInput.value.trim();
    const subject = subjectInput.value.trim();
    const classType = classTypeSelect.value;
    const classesStr = classesPerWeekInput.value.trim();

    if (!name || !subject || !classesStr) {
      setMessage(teacherMessageEl, "Please fill all fields.", "error");
      return;
    }
    const classesPerWeek = parseInt(classesStr, 10);
    if (!Number.isInteger(classesPerWeek) || classesPerWeek <= 0) {
      setMessage(teacherMessageEl, "Classes / Week must be a positive integer.", "error");
      return;
    }
    if (classesPerWeek > 60) {
      setMessage(teacherMessageEl, "Please enter a realistic value (≤ 60).", "error");
      return;
    }

    teachers.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
      name,
      subject,
      classType,
      classesPerWeek,
    });
    teacherNameInput.value = "";
    subjectInput.value = "";
    classesPerWeekInput.value = "";
    classTypeSelect.value = "Lecture";
    renderTeacherList();
    timetableGenerated = false;
    csvBtn.disabled = true;
    pdfBtn.disabled = true;
    setMessage(teacherMessageEl, "Teacher added.", "success");
    setMessage(timetableMessageEl, "Timetable not generated yet.", "info");
  }

  function clearTeachers() {
    if (!teachers.length) {
      setMessage(teacherMessageEl, "No teachers to clear.", "info");
      return;
    }
    if (!confirm("Clear all teachers?")) return;
    teachers = [];
    renderTeacherList();
    timetable = {};
    timetableTableEl.innerHTML = "";
    timetableGenerated = false;
    csvBtn.disabled = true;
    pdfBtn.disabled = true;
    setMessage(teacherMessageEl, "All teachers cleared.", "info");
    setMessage(timetableMessageEl, "No timetable. Add teachers and generate.", "info");
  }

  function generateTimetable() {
    if (!teachers.length) {
      setMessage(teacherMessageEl, "Add at least one teacher first.", "error");
      return;
    }
    const totalRequested = teachers.reduce((s, t) => s + t.classesPerWeek, 0);
    if (totalRequested < TOTAL_LECTURES_PER_WEEK) {
      setMessage(
        teacherMessageEl,
        `Need at least ${TOTAL_LECTURES_PER_WEEK} total classes; you provided ${totalRequested}.`,
        "error"
      );
      return;
    }

    const pool = [];
    teachers.forEach((t) => {
      for (let i = 0; i < t.classesPerWeek; i++) {
        pool.push({ teacherName: t.name, subject: t.subject, classType: t.classType });
      }
    });
    shuffleArray(pool);
    const usable = pool.slice(0, TOTAL_LECTURES_PER_WEEK);
    let p = 0;
    timetable = {};
    DAYS.forEach((day) => {
      const row = [];
      SLOTS.forEach((slot) => {
        if (slot.type === "lunch") row.push({ type: "lunch" });
        else row.push({ type: "lecture", ...usable[p++] });
      });
      timetable[day] = row;
    });

    renderTimetable();
    timetableGenerated = true;
    csvBtn.disabled = false;
    pdfBtn.disabled = false;
    setMessage(timetableMessageEl, "Timetable generated. You can download CSV/PDF.", "success");
  }

  function renderTimetable() {
    timetableTableEl.innerHTML = "";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "Day / Time";
    hr.appendChild(corner);
    SLOTS.forEach((s) => {
      const th = document.createElement("th");
      th.textContent = s.label;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    timetableTableEl.appendChild(thead);

    const tbody = document.createElement("tbody");
    DAYS.forEach((day) => {
      const tr = document.createElement("tr");
      const dayCell = document.createElement("td");
      dayCell.className = "day-cell";
      dayCell.textContent = day;
      tr.appendChild(dayCell);

      (timetable[day] || []).forEach((cell, idx) => {
        const td = document.createElement("td");
        if (cell.type === "lunch") {
          td.className = "lunch-cell";
          td.textContent = "Lunch Break";
        } else {
          td.innerHTML = `<div>${cell.teacherName || ""}</div><div class="muted">${cell.subject || ""}</div>`;
          if (cell.classType) {
            const typeTag = document.createElement("div");
            typeTag.className = "class-type";
            typeTag.textContent = cell.classType;
            td.appendChild(typeTag);
          }
          if (idx <= 3 && cell.teacherName && cell.subject) {
            const tag = document.createElement("div");
            tag.className = "lecture-tag";
            tag.textContent = "Morning";
            td.appendChild(tag);
          }
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
    timetableTableEl.appendChild(tbody);
  }

  function downloadCSV() {
    if (!timetableGenerated) {
      setMessage(timetableMessageEl, "Generate first.", "error");
      return;
    }
    let csv = "";
    const header = ["Day / Time", ...SLOTS.map((s) => s.label)];
    csv += header.map(csvEscape).join(",") + "\n";
    DAYS.forEach((day) => {
      const row = [day];
      (timetable[day] || []).forEach((cell) => {
        if (cell.type === "lunch") {
          row.push("Lunch Break");
        } else {
          row.push(`${cell.teacherName} - ${cell.subject} (${cell.classType})`);
        }
      });
      csv += row.map(csvEscape).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "college_timetable.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!timetableGenerated) {
      setMessage(timetableMessageEl, "Generate first.", "error");
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF not loaded. Check network/CDN.");
      setMessage(timetableMessageEl, "jsPDF not loaded. Check your internet.", "error");
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 30;
      const usableW = pageWidth - margin * 2;
      const usableH = pageHeight - margin * 2;
      const cols = SLOTS.length + 1;
      const rows = DAYS.length + 1;
      const cellW = usableW / cols;
      const cellH = Math.min(usableH / rows, 40);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("College Timetable", pageWidth / 2, margin - 10, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      let y = margin, x = margin;
      doc.rect(x, y, cellW, cellH);
      doc.text("Day / Time", x + 4, y + cellH / 2 + 3);
      SLOTS.forEach((slot, i) => {
        x = margin + cellW * (i + 1);
        doc.rect(x, y, cellW, cellH);
        doc.text(slot.label, x + 4, y + cellH / 2 + 3);
      });

      doc.setFont("helvetica", "normal");
      DAYS.forEach((day, r) => {
        y = margin + cellH * (r + 1);
        x = margin;
        doc.rect(x, y, cellW, cellH);
        doc.text(day, x + 4, y + cellH / 2 + 3);

        (timetable[day] || []).forEach((cell, c) => {
          x = margin + cellW * (c + 1);
          doc.rect(x, y, cellW, cellH);
          const text =
            cell.type === "lunch"
              ? "Lunch Break"
              : `${cell.teacherName}\n${cell.subject} (${cell.classType})`;
          const lines = doc.splitTextToSize(text, cellW - 8);
          doc.text(lines, x + 4, y + 10);
        });
      });

      doc.save("college_timetable.pdf");
      setMessage(timetableMessageEl, "PDF downloaded.", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      setMessage(timetableMessageEl, "PDF failed. See console for details.", "error");
    }
  }

  addTeacherBtn.addEventListener("click", addTeacher);
  clearTeachersBtn.addEventListener("click", clearTeachers);
  generateBtn.addEventListener("click", generateTimetable);
  csvBtn.addEventListener("click", downloadCSV);
  pdfBtn.addEventListener("click", downloadPDF);
  [teacherNameInput, subjectInput, classesPerWeekInput].forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTeacher();
      }
    });
  });

  renderTeacherList();
})();

