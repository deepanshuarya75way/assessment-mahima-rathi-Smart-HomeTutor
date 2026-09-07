import React, { useState } from 'react';
import { adminApi } from '../../../services/adminApi';

export const AdminCatalogTab = ({ subjects = [], onOpenAddSubject, onUpdateSubject, onDeleteSubject }) => {
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Editing States
  const [editingKey, setEditingKey] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Removed default topics state (for non-DB standard items)
  const [removedTopics, setRemovedTopics] = useState([]);

  // Class definitions styled in the format of SubjectsPage.jsx
  const classGroups = [
    {
      id: 'c1-5',
      title: 'Classes 1–5',
      badge: 'Primary',
      icon: 'fa-shapes',
      accentColor: '#3b82f6',
      defaultTopics: ['English', 'Hindi', 'Mathematics', 'EVS', 'Computer'],
      gradeKeywords: ['1-5', '1–5', 'primary', 'class 1', 'class 2', 'class 3', 'class 4', 'class 5', 'grade 1', 'grade 2', 'grade 3', 'grade 4', 'grade 5']
    },
    {
      id: 'c6-8',
      title: 'Classes 6–8',
      badge: 'Middle',
      icon: 'fa-atom',
      accentColor: '#10b981',
      defaultTopics: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
      gradeKeywords: ['6-8', '6–8', 'middle', 'class 6', 'class 7', 'class 8', 'grade 6', 'grade 7', 'grade 8']
    },
    {
      id: 'c9-10',
      title: 'Classes 9–10',
      badge: 'Secondary',
      icon: 'fa-book-bookmark',
      accentColor: '#f59e0b',
      defaultTopics: ['Mathematics', 'Science', 'Social Science', 'English', 'Computer'],
      gradeKeywords: ['9-10', '9–10', 'secondary', 'class 9', 'class 10', 'grade 9', 'grade 10']
    },
    {
      id: 'c11-12-sci',
      title: 'Class 11–12',
      badge: 'Science',
      icon: 'fa-flask',
      accentColor: '#8b5cf6',
      defaultTopics: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English'],
      gradeKeywords: ['science', '11-12 science', 'class 11-12 science']
    },
    {
      id: 'c11-12-com',
      title: 'Class 11–12',
      badge: 'Commerce',
      icon: 'fa-briefcase',
      accentColor: '#ec4899',
      defaultTopics: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'Entrepreneurship', 'Informatics Prac.', 'English'],
      gradeKeywords: ['commerce', 'accounts', 'business', '11-12 commerce']
    },
    {
      id: 'c11-12-hum',
      title: 'Class 11–12',
      badge: 'Humanities',
      icon: 'fa-palette',
      accentColor: '#06b6d4',
      defaultTopics: ['History', 'Political Science', 'Geography', 'Sociology', 'Psychology', 'Economics', 'English'],
      gradeKeywords: ['humanities', 'arts', 'history', '11-12 humanities']
    }
  ];

  // Match subject from MongoDB to a class group
  const matchesGroup = (subj, group) => {
    const g = (subj.grade || '').toLowerCase();
    const c = (subj.category || '').toLowerCase();
    const n = (subj.name || '').toLowerCase();

    const hasKeyword = group.gradeKeywords.some(kw => g.includes(kw) || c.includes(kw) || n.includes(kw));
    if (hasKeyword) return true;

    if (g.includes('11-12') || g.includes('11–12') || g.includes('grade 11') || g.includes('grade 12')) {
      if (group.id === 'c11-12-sci' && (c.includes('cbse') || c.includes('icse') || c.includes('science'))) return true;
      if (group.id === 'c11-12-com' && c.includes('commerce')) return true;
      if (group.id === 'c11-12-hum' && (c.includes('humanities') || c.includes('general'))) return true;
    }

    return false;
  };

  // Group subjects dynamically
  const assignedSubjectsByGroup = {};
  classGroups.forEach(cg => {
    assignedSubjectsByGroup[cg.id] = subjects.filter(s => matchesGroup(s, cg));
  });

  // Catch unassigned custom subjects
  const unassignedSubjects = subjects.filter(s => {
    return !classGroups.some(cg => matchesGroup(s, cg));
  });

  // Filter groups according to selected class ID
  const filteredClassGroups = selectedClassId === 'all'
    ? classGroups
    : classGroups.filter(cg => cg.id === selectedClassId);

  // Edit Handlers
  const startEditing = (key, currentName) => {
    setEditingKey(key);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditingName('');
  };

  const handleSaveEdit = async (item, groupTitle) => {
    if (!editingName.trim()) {
      alert('Subject name cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      if (typeof item === 'object' && item._id) {
        // Update existing MongoDB subject
        if (onUpdateSubject) {
          await onUpdateSubject(item._id, { name: editingName.trim() });
        }
      } else {
        // Convert default subject topic to MongoDB entry
        const res = await adminApi.addSubject({
          name: editingName.trim(),
          category: 'CBSE',
          grade: groupTitle,
          description: ''
        });
        if (res.success && onUpdateSubject) {
          await onUpdateSubject(res.subject._id, { name: editingName.trim() });
        }
      }
      cancelEditing();
    } catch (err) {
      console.error('Save Subject Edit Error:', err);
      alert('Error updating subject name.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Handler for ALL Subjects
  const handleSubjectDelete = async (item, groupTitle) => {
    if (typeof item === 'object' && item._id) {
      if (onDeleteSubject) onDeleteSubject(item._id);
    } else {
      const topicName = typeof item === 'string' ? item : item.name;
      const confirmed = window.showCustomConfirm
        ? await window.showCustomConfirm(`Delete subject "${topicName}" from ${groupTitle}?`, 'Delete Subject', 'Delete', 'Cancel')
        : window.confirm(`Delete subject "${topicName}" from ${groupTitle}?`);
      if (!confirmed) return;
      const topicKey = `${groupTitle}-${topicName}`;
      setRemovedTopics((prev) => [...prev, topicKey, topicName]);
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        {/* CARD HEADER */}
        <div className="dash-card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-graduation-cap" style={{ color: '#f59e0b' }}></i> Academic Catalog & Boards Directory
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Manage curriculum subjects and class/grade assignments in the same layout as the public Subjects Directory.
            </p>
          </div>

          <button
            className="dash-btn dash-btn-primary"
            onClick={() => onOpenAddSubject && onOpenAddSubject('')}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700', borderRadius: '8px' }}
          >
            <i className="fa-solid fa-plus"></i> Add Subject
          </button>
        </div>

        {/* CLASS / GRADE SELECTION FILTER BAR */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justify: 'space-between'
        }}>
          {/* CLASS SELECTOR TABS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Class / Grade:
            </span>
            <button
              type="button"
              className={`dash-btn ${selectedClassId === 'all' ? 'dash-btn-primary' : 'dash-btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '20px' }}
              onClick={() => setSelectedClassId('all')}
            >
              All Classes ({classGroups.length})
            </button>
            {classGroups.map(cg => (
              <button
                key={cg.id}
                type="button"
                className={`dash-btn ${selectedClassId === cg.id ? 'dash-btn-primary' : 'dash-btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '20px' }}
                onClick={() => setSelectedClassId(cg.id)}
              >
                <i className={`fa-solid ${cg.icon}`} style={{ marginRight: '5px' }}></i> {cg.title} ({cg.badge})
              </button>
            ))}
          </div>

          {/* SEARCH INPUT */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search subject in class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* SUBJECTS & CLASSES GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {filteredClassGroups.map(group => {
            const dbAssigned = assignedSubjectsByGroup[group.id] || [];
            
            // Combine default topics and DB topics
            const allTopicItems = [...group.defaultTopics];
            dbAssigned.forEach(s => {
              if (!allTopicItems.some(t => typeof t === 'string' ? t.toLowerCase() === s.name.toLowerCase() : t.name.toLowerCase() === s.name.toLowerCase())) {
                allTopicItems.push(s);
              }
            });

            // Filter out removed topics for this group
            const activeTopics = allTopicItems.filter(item => {
              const name = typeof item === 'string' ? item : item.name;
              const key = `${group.title}-${name}`;
              return !removedTopics.includes(key) && !removedTopics.includes(name);
            });

            // Filter items by searchQuery
            const q = searchQuery.trim().toLowerCase();
            const visibleItems = q
              ? activeTopics.filter(item => {
                  const topicName = typeof item === 'string' ? item : item.name;
                  return topicName.toLowerCase().includes(q) || group.title.toLowerCase().includes(q) || group.badge.toLowerCase().includes(q);
                })
              : activeTopics;

            return (
              <div
                key={group.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(15, 42, 74, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* ACCENT BAR */}
                <div style={{ height: '4px', background: group.accentColor, width: '100%' }}></div>

                {/* CARD BODY */}
                <div style={{ padding: '20px' }}>
                  {/* HEADER AREA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: `${group.accentColor}15`,
                      color: group.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      fontSize: '20px',
                      flexShrink: 0
                    }}>
                      <i className={`fa-solid ${group.icon}`}></i>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f2a4a' }}>
                          {group.title}
                        </h4>
                        <span style={{
                          background: `${group.accentColor}18`,
                          color: group.accentColor,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          {group.badge}
                        </span>
                      </div>
                      <small style={{ color: '#64748b', fontSize: '12px' }}>
                        {visibleItems.length} Subjects Assigned
                      </small>
                    </div>
                  </div>

                  {/* TOPICS / SUBJECTS LIST */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {visibleItems.length === 0 ? (
                        <li style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                          No subjects match query.
                        </li>
                      ) : (
                        visibleItems.map((item, idx) => {
                          const isDbItem = typeof item === 'object' && item._id;
                          const subjectName = isDbItem ? item.name : item;

                          const itemKey = isDbItem ? item._id : `${group.id}-${idx}`;
                          const isEditingThis = editingKey === itemKey;

                          return (
                            <li
                              key={itemKey}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: isDbItem ? '#f0f9ff' : '#f8fafc',
                                border: isDbItem ? '1px solid #bae6fd' : '1px solid #f1f5f9',
                                fontSize: '13px',
                                color: '#1e293b'
                              }}
                            >
                              {isEditingThis ? (
                                /* INLINE EDIT FORM */
                                <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #0284c7',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      outline: 'none'
                                    }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEdit(item, group.title);
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(item, group.title)}
                                    disabled={savingEdit}
                                    style={{
                                      background: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {savingEdit ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={savingEdit}
                                    style={{
                                      background: '#cbd5e1',
                                      color: '#334155',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                </div>
                              ) : (
                                /* NORMAL VIEW MODE (SUBJECT NAME ONLY - NO BOARD BADGES) */
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-angle-right" style={{ color: group.accentColor, fontSize: '11px' }}></i>
                                    <span
                                      style={{ fontWeight: isDbItem ? '700' : '600', cursor: 'pointer' }}
                                      onClick={() => startEditing(itemKey, subjectName)}
                                      title="Click to edit subject name"
                                    >
                                      {subjectName}
                                    </span>
                                  </div>

                                  {/* ACTION BUTTONS: EDIT & DELETE (AVAILABLE ON ALL SUBJECTS) */}
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      title="Edit subject name"
                                      onClick={() => startEditing(itemKey, subjectName)}
                                      style={{
                                        background: '#e0f2fe',
                                        border: '1px solid #7dd3fc',
                                        color: '#0369a1',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <i className="fa-solid fa-pen-to-square"></i> Edit
                                    </button>

                                    <button
                                      type="button"
                                      title="Delete subject"
                                      onClick={() => handleSubjectDelete(item, group.title)}
                                      style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fca5a5',
                                        color: '#ef4444',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <i className="fa-solid fa-trash"></i> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                </div>

                {/* CARD FOOTER WITH ADD SUBJECT ACTION */}
                <div style={{
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 20px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    Grade: {group.title}
                  </span>
                  <button
                    type="button"
                    className="dash-btn dash-btn-outline"
                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700', borderColor: group.accentColor, color: group.accentColor }}
                    onClick={() => onOpenAddSubject && onOpenAddSubject(group.title)}
                  >
                    <i className="fa-solid fa-plus"></i> Add Subject to {group.title}
                  </button>
                </div>
              </div>
            );
          })}

          {/* UNASSIGNED OR SPECIALIZED CLASSES CARD */}
          {unassignedSubjects.length > 0 && selectedClassId === 'all' && (
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    fontSize: '20px'
                  }}>
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f2a4a' }}>
                      Specialized & Test Prep
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Custom Course Categories</span>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unassignedSubjects
                    .filter(subj => !removedTopics.includes(subj._id) && !removedTopics.includes(subj.name))
                    .map(subj => {
                      const isEditingThis = editingKey === subj._id;

                      return (
                        <li
                          key={subj._id}
                          style={{
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px'
                          }}
                        >
                          {isEditingThis ? (
                            <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #0284c7',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  outline: 'none'
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(subj, 'Specialized');
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(subj, 'Specialized')}
                                disabled={savingEdit}
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                {savingEdit ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={savingEdit}
                                style={{
                                  background: '#cbd5e1',
                                  color: '#334155',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-angle-right" style={{ color: '#475569', fontSize: '11px' }}></i>
                                <span
                                  style={{ fontWeight: '700', color: '#0f2a4a', cursor: 'pointer' }}
                                  onClick={() => startEditing(subj._id, subj.name)}
                                  title="Click to edit subject name"
                                >
                                  {subj.name}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  title="Edit subject name"
                                  onClick={() => startEditing(subj._id, subj.name)}
                                  style={{
                                    background: '#e0f2fe',
                                    border: '1px solid #7dd3fc',
                                    color: '#0369a1',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <i className="fa-solid fa-pen-to-square"></i> Edit
                                </button>

                                <button
                                  type="button"
                                  title="Delete subject"
                                  onClick={() => handleSubjectDelete(subj, 'Specialized')}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    color: '#ef4444',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <i className="fa-solid fa-trash"></i> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}
                  onClick={() => onOpenAddSubject && onOpenAddSubject('')}
                >
                  <i className="fa-solid fa-plus"></i> Add Custom Subject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
