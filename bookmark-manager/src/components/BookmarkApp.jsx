import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getStore, STORE_TYPES } from '../stores/index.js';
import { createLLM, LLM_PROVIDERS } from '../llm/index.js';

import HelpModal from './HelpModal';
import MessageModal from './MessageModal';
import BookmarkForm from './BookmarkForm';
import ImportExportContent from './ImportExportContent';
import DeleteConfirmModal from './DeleteConfirmModal';
import OptionsModal from './OptionsModal';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : undefined;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

const BookmarkApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState(null);
  const [bookmarksToDelete, setBookmarksToDelete] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [multiSelectedBookmarkIds, setMultiSelectedBookmarkIds] = useState([]);
  const bookmarksRef = useRef(bookmarks);
  const selectedBookmarkIdRef = useRef(selectedBookmarkId);
  const multiSelectedBookmarkIdsRef = useRef(multiSelectedBookmarkIds);

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ message: '', type: 'info' });

  const storeRef = useRef(null);
  // Runtime-selectable LLM provider (persisted)
  const [runtimeProvider, setRuntimeProvider] = useState(() => {
    try {
      const saved = localStorage.getItem('bm_runtime_llm_provider');
      const globalDefault = (typeof __llm_provider__ !== 'undefined' && __llm_provider__) || LLM_PROVIDERS.GEMINI;
      return (saved || globalDefault || LLM_PROVIDERS.GEMINI).toString().toLowerCase();
    } catch {
      const globalDefault = (typeof __llm_provider__ !== 'undefined' && __llm_provider__) || LLM_PROVIDERS.GEMINI;
      return (globalDefault || LLM_PROVIDERS.GEMINI).toString().toLowerCase();
    }
  });
  // Provider-specific runtime options (persisted)
  const [runtimeProviderOptions, setRuntimeProviderOptions] = useState(() => {
    try {
      const raw = localStorage.getItem('bm_runtime_llm_options');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    bookmarksRef.current = bookmarks;
    selectedBookmarkIdRef.current = selectedBookmarkId;
    multiSelectedBookmarkIdsRef.current = multiSelectedBookmarkIds;
  }, [bookmarks, selectedBookmarkId, multiSelectedBookmarkIds]);

  useEffect(() => {
    const init = async () => {
      const preferred = typeof __use_firebase__ !== 'undefined' && __use_firebase__ ? STORE_TYPES.FIREBASE : STORE_TYPES.LOCAL;
      const s = await getStore(preferred, { firebaseConfig, appId, initialAuthToken });
      await s.init();
      storeRef.current = s;
      const data = await s.list();
      setBookmarks(data);
      setIsLoading(false);
      const unsub = s.subscribe((all) => setBookmarks(all));
      return () => unsub?.();
    };
    init();
  }, []);

  // Store handles live updates via subscribe; no Firestore-specific effect needed here.

  // Keyboard: Escape clears selection
  useEffect(() => {
    const onKeyDown = async (e) => {
      if (e.key === 'Escape') {
        setSelectedBookmarkId(null);
        setMultiSelectedBookmarkIds([]);
        setBookmarksToDelete([]);
      }
      // Use ref to get latest selectedBookmarkId
      if (e.key === 'c' && selectedBookmarkIdRef.current) {
        const selected = bookmarksRef.current.find(b => b.id === selectedBookmarkIdRef.current);
        if (selected && selected.url) {
          setIsProcessing(true);
          const status = await fetchUrlStatus(selected.url);
          setIsProcessing(false);
          if (status === 'valid') {
            showCustomMessage('URL is valid.', 'success');
          } else {
            showCustomMessage('URL is invalid or unreachable. Persisting status.', 'error');
            // Persist unreachable status and set urlStatus for immediate UI feedback
            await saveBookmark({ ...selected, unreachable: true, urlStatus: 'invalid', updatedAt: new Date().toISOString() });
          }
        } else {
          showCustomMessage('No URL found for selected bookmark.', 'warning');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showCustomMessage = (message, type = 'info') => {
    setMessageModalContent({ message, type });
    setIsMessageModalOpen(true);
  };

  const saveBookmark = async (bookmarkToSave) => {
    if (!storeRef.current) {
      showCustomMessage('Error: Bookmark store is not initialized. Please reload the app or check for setup issues.', 'error');
      return;
    }
    if (bookmarkToSave.id) {
      const { id, ...patch } = bookmarkToSave;
      await storeRef.current.update(id, { ...patch, updatedAt: new Date().toISOString() });
    } else {
      await storeRef.current.create({ ...bookmarkToSave, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  };
  const deleteBookmark = async (id) => {
    if (!storeRef.current) return;
    await storeRef.current.remove(id);
  };
  const saveAllBookmarks = async (arr) => {
    if (!storeRef.current) return;
    await storeRef.current.bulkReplace(arr);
  };
  const fetchUrlStatus = async (url) => {
    if (!url || url.trim() === '') return 'valid';
    try {
      const corsUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(corsUrl, { method: 'HEAD', mode: 'cors' });
      return response.ok ? 'valid' : 'invalid';
    } catch (error) {
      console.warn(`URL check failed for ${url}:`, error);
      return 'invalid';
    }
  };
  // ---- Agent helpers ----
  const searchBookmarks = (searchTerm, list) => {
    return list.filter(bookmark =>
      (bookmark.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.url?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  };

  const findWithTags = (includeTags = [], excludeTags = [], list) => {
    const lowerInclude = includeTags.map(t => t.toLowerCase());
    const lowerExclude = excludeTags.map(t => t.toLowerCase());
    return list.filter(b => {
      const bookmarkTags = b.tags ? b.tags.map(bt => bt.toLowerCase()) : [];
      return (
        lowerInclude.every(tag => bookmarkTags.includes(tag)) &&
        !lowerExclude.some(tag => bookmarkTags.includes(tag))
      );
    });
  };

  const findIncludes = (field, value, list) => {
    const lowerValue = (value || '').toLowerCase();
    return list.filter(b => ((b[field] || '') + '').toLowerCase().includes(lowerValue));
  };

  const findStartsWith = (field, value, list) => {
    const lowerValue = (value || '').toLowerCase();
    return list.filter((b) => {
      if (field === 'tags') {
        const tags = Array.isArray(b.tags) ? b.tags : [];
        return tags.some((t) => (t || '').toString().toLowerCase().startsWith(lowerValue));
      }
      const val = ((b[field] ?? '') + '').toLowerCase();
      return lowerValue ? val.startsWith(lowerValue) : true;
    });
  };

  const filterByRating = (params = {}, list) => {
    const { minRating, maxRating, comparator, exact } = params || {};
    const hasExact = typeof exact === 'number' || comparator === 'eq';
    const min = hasExact ? Number(exact) : (typeof minRating === 'number' ? Number(minRating) : undefined);
    const max = hasExact ? Number(exact) : (typeof maxRating === 'number' ? Number(maxRating) : undefined);
    return list.filter((b) => {
      const r = Number(b.rating) || 0;
      if (hasExact) return r === Number(exact);
      if (typeof min === 'number' && typeof max === 'number') return r >= min && r <= max;
      if (typeof min === 'number') return r >= min;
      if (typeof max === 'number') return r <= max;
      return true;
    });
  };

  const sortBookmarks = (sortBy, order, list) => {
    // Normalize sort key and order to accept common aliases
    const rawKey = (sortBy || 'title').toString().trim().toLowerCase();
    const key = (
      rawKey === 'folder' || rawKey === 'folderid' ? 'folderId' :
      rawKey === 'name' ? 'title' :
      rawKey === 'stars' ? 'rating' :
      rawKey === 'created' || rawKey === 'date' || rawKey === 'added' ? 'createdAt' :
      rawKey === 'modified' || rawKey === 'updated' ? 'updatedAt' :
      rawKey
    );
    const ord = (order || 'asc').toString().trim().toLowerCase().startsWith('asc') ? 'asc' : 'desc';
    return [...list].sort((a, b) => {
      let valA = a[key] ?? '';
      let valB = b[key] ?? '';
      if (key === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      } else if (key === 'createdAt' || key === 'updatedAt') {
        valA = a[key] ? new Date(a[key]).getTime() : 0;
        valB = b[key] ? new Date(b[key]).getTime() : 0;
      } else {
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      }
      if (ord === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    });
  };

  const limitResults = (count, list, direction = 'first') => {
    const n = Number(count) || 0;
    if (!n || n <= 0) return list;
    return direction === 'last' ? list.slice(-n) : list.slice(0, n);
  };

  const applyAgentPlan = (plan, list) => {
    if (!plan) return list;
    const actions = Array.isArray(plan) ? plan : [plan];
    // If any step has a numeric priority, sort by it (ascending) in a stable way; else use given order
    const hasPriority = actions.some((s) => typeof s?.priority === 'number');
    const ordered = hasPriority
      ? actions.map((s, idx) => ({ s, idx }))
          .sort((a, b) => (a.s.priority - b.s.priority) || (a.idx - b.idx))
          .map((x) => x.s)
      : actions;
    let currentResults = [...list];
    for (const step of ordered) {
      const { action, parameters = {} } = step;
      // Ignore non-visual actions (reorders/persistence) in ephemeral display pipeline
      if (['importBookmarks', 'exportBookmarks', 'resetSearch', 'showAllBookmarks', 'removeDuplicates', 'reorder', 'reorderAscending', 'reorderDescending', 'persistSortedOrder'].includes(action)) continue;
      switch (action) {
        case 'searchBookmarks':
          currentResults = searchBookmarks(parameters.searchTerm || '', currentResults); break;
        case 'findIncludes':
          currentResults = findIncludes(parameters.field || 'title', parameters.value || '', currentResults); break;
        case 'findStartsWith':
          currentResults = findStartsWith(parameters.field || 'title', parameters.value || '', currentResults); break;
        case 'findWithTags':
          currentResults = findWithTags(parameters.includeTags || [], parameters.excludeTags || [], currentResults); break;
        case 'filterByRating':
          currentResults = filterByRating(parameters || {}, currentResults); break;
        case 'sortBookmarks':
          currentResults = sortBookmarks(parameters.sortBy || 'title', parameters.order || 'asc', currentResults); break;
        case 'limitResults':
          currentResults = limitResults(Number(parameters.count) || 0, parameters.scope === 'all' ? list : currentResults, (parameters.direction || 'first')); break;
        case 'limitFirst':
          // Apply to current results to preserve prior actions (e.g., sort → limit)
          currentResults = limitResults(Number(parameters.count) || 0, currentResults, 'first'); break;
        case 'limitLast':
          // Apply to current results to preserve prior actions (e.g., sort → limit)
          currentResults = limitResults(Number(parameters.count) || 0, currentResults, 'last'); break;
        default:
          break;
      }
    }
    return currentResults;
  };

  const displayedBookmarks = useMemo(() => {
    // Ensure unreachable bookmarks always show as invalid in UI
    const processed = applyAgentPlan(lastAction, bookmarks).map(b =>
      b.unreachable ? { ...b, urlStatus: 'invalid' } : b
    );
    return processed;
  }, [bookmarks, lastAction]);

  // Persisted reorder actions
  const persistReorder = async (order = 'asc', sortByOverride) => {
    if (!storeRef.current) return;
    // Persist across the FULL dataset using the last sort criterion, ignoring filters/limits.
    const plan = Array.isArray(lastAction) ? lastAction : lastAction ? [lastAction] : [];
    let sortBy = 'title';
    if (typeof sortByOverride === 'string' && sortByOverride) {
      sortBy = sortByOverride;
    } else {
      const sortStep = plan.find((s) => s.action === 'sortBookmarks');
      if (sortStep && sortStep.parameters?.sortBy) sortBy = sortStep.parameters.sortBy;
    }
    try {
      await storeRef.current.persistSortedOrder?.({ sortBy, order });
      showCustomMessage(`Reordered ${order === 'asc' ? 'ascending' : 'descending'} by ${sortBy} and saved.`, 'success');
      // Remove ephemeral sort from the current plan so UI shows persisted order
      if (plan.length > 0) {
        const withoutSort = plan.filter((s) => !['sortBookmarks','reorder','reorderAscending','reorderDescending','persistSortedOrder'].includes(s.action));
        setLastAction(withoutSort.length > 0 ? withoutSort : null);
      }
    } catch (e) {
      console.error('Persist reorder failed', e);
      showCustomMessage('Failed to persist new order.', 'error');
    }
  };

  // Handle agent-triggered reorder actions
  const handlePersistReorderFromAgent = async (step) => {
    const action = (step?.action || '').toLowerCase();
    const order = step?.parameters?.order || (action.includes('descending') ? 'desc' : 'asc');
    let sortBy = step?.parameters?.sortBy || 'title';
    if (!step?.parameters?.sortBy) {
      const plan = Array.isArray(lastAction) ? lastAction : lastAction ? [lastAction] : [];
      const sortStep = plan.find((s) => s.action === 'sortBookmarks');
      if (sortStep && sortStep.parameters?.sortBy) sortBy = sortStep.parameters.sortBy;
    }
    await persistReorder(order, sortBy);
  };

  // UI helpers
  const handleAddNewBookmark = () => {
    setEditingBookmark({ id: null, title: '', url: '', description: '', tags: [], rating: 0, folderId: '', faviconUrl: '' });
    setIsModalOpen(true);
  };

  const handleImportExportOpen = () => setIsImportExportModalOpen(true);
  const handleImportExportClose = () => setIsImportExportModalOpen(false);

  const handleBookmarkClick = (bookmark, e) => {
    if (e?.shiftKey || e?.key === ' ') {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      setSelectedBookmarkId(null);
      setMultiSelectedBookmarkIds([]);
      return;
    }
    if (e?.metaKey || e?.ctrlKey) {
      setMultiSelectedBookmarkIds((prev) => {
        let next = prev;
        // If there's a single selection, promote it into multi-select before toggling
        if (selectedBookmarkId && !prev.includes(selectedBookmarkId)) {
          next = [...prev, selectedBookmarkId];
        }
        // Toggle clicked bookmark in the multi-select list
        if (next.includes(bookmark.id)) {
          next = next.filter((id) => id !== bookmark.id);
        } else {
          next = [...next, bookmark.id];
        }
        return next;
      });
      setSelectedBookmarkId(null);
      return;
    }
    setSelectedBookmarkId(bookmark.id);
    setMultiSelectedBookmarkIds([]);
  };

  const handleBookmarkDoubleClick = (bookmark) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  };

  // Keyboard accessibility for bookmark tiles
  const handleBookmarkKeyDown = (e, bookmark) => {
    // Activate on Enter or Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Enter/Space opens the link in a new tab (parity with Shift+Click)
        if (bookmark.url) {
          window.open(bookmark.url, '_blank', 'noopener,noreferrer');
          setSelectedBookmarkId(null);
          setMultiSelectedBookmarkIds([]);
        }
        return;
      }
      // Default behavior: select the bookmark (parity with Click)
      handleBookmarkClick(bookmark);
    }
  };

  // Duplicate detection by title+url (case-insensitive)
  const findDuplicateIds = (list) => {
    const seen = new Map();
    const dups = [];
    for (const b of list) {
      const key = `${(b.title || '').trim().toLowerCase()}|${(b.url || '').trim().toLowerCase()}`;
      if (seen.has(key)) dups.push(b.id); else seen.set(key, b.id);
    }
    return dups;
  };

  const handleRemoveDuplicates = () => {
    const ids = findDuplicateIds(displayedBookmarks);
    if (ids.length === 0) {
      showCustomMessage('No duplicate bookmarks found in the current view.', 'info');
      return;
    }
    setBookmarksToDelete(ids);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
  if (!storeRef.current) return;
    const ids = [...bookmarksToDelete];
    if (ids.length === 0) return;
    try {
      if (typeof storeRef.current.removeMany === 'function') {
        await storeRef.current.removeMany(ids);
      } else {
        // Fallback: sequential
        for (const id of ids) {
          try { await storeRef.current.remove(id); } catch {}
        }
      }
      showCustomMessage(`Deleted ${ids.length} bookmark(s).`, 'success');
    } finally {
      setBookmarksToDelete([]);
      setIsDeleteConfirmModalOpen(false);
      setSelectedBookmarkId(null);
      setMultiSelectedBookmarkIds([]);
    }
  };

  const handleCancelDelete = () => {
    setBookmarksToDelete([]);
    setIsDeleteConfirmModalOpen(false);
  };

  // Keyboard shortcuts: Esc, Cmd/Ctrl+A (select all), Cmd/Ctrl+D (delete)
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ignore when focus is in a typing context or a modal is open
      const tag = e.target?.tagName?.toLowerCase();
      const isTypingContext = ['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable;
      if (isTypingContext || isModalOpen || isImportExportModalOpen || isDeleteConfirmModalOpen || isHelpModalOpen) return;

      const isMac = navigator.userAgentData
        ? navigator.userAgentData.platform?.toUpperCase().includes('MAC')
        : navigator.userAgent.toUpperCase().includes('MAC');
      if (e.key === 'Escape') {
        setSelectedBookmarkId(null);
        setMultiSelectedBookmarkIds([]);
        setBookmarksToDelete([]);
        return;
      }
      const comboA = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'a';
      const comboD = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'd';
      if (comboA) {
        e.preventDefault();
        setMultiSelectedBookmarkIds(bookmarks.map(b => b.id));
      }
      if (comboD) {
        e.preventDefault();
        const ids = selectedBookmarkId ? [selectedBookmarkId] : multiSelectedBookmarkIds.length ? [...multiSelectedBookmarkIds] : [];
        if (ids.length === 0) {
          showCustomMessage('Please select bookmark(s) to delete.', 'info');
        } else {
          setBookmarksToDelete(ids);
          setIsDeleteConfirmModalOpen(true);
          setSelectedBookmarkId(null);
          setMultiSelectedBookmarkIds([]);
        }
      }

      // Plain 'e' to edit the selected bookmark (single selection)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'e') {
        const id = selectedBookmarkId || (multiSelectedBookmarkIds.length === 1 ? multiSelectedBookmarkIds[0] : null);
        if (id) {
          const b = bookmarks.find(x => x.id === id);
          if (b) {
            e.preventDefault();
            setEditingBookmark(b);
            setIsModalOpen(true);
          }
        }
      }

      // Plain 'space' to edit the selected bookmark (single selection)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === ' ') {
        const id = selectedBookmarkId || (multiSelectedBookmarkIds.length === 1 ? multiSelectedBookmarkIds[0] : null);
        if (id) {
          const b = bookmarks.find(x => x.id === id);
          if (b) {
            e.preventDefault();
            handleBookmarkClick(b, e);
          }
        }
      }
    
      // Plain 'd' to delete (open confirmation modal)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'd') {
        const ids = selectedBookmarkId ? [selectedBookmarkId] : (multiSelectedBookmarkIds.length ? [...multiSelectedBookmarkIds] : []);
        if (ids.length === 0) {
          showCustomMessage('Please select bookmark(s) to delete.', 'info');
        } else {
          e.preventDefault();
          setBookmarksToDelete(ids);
          setIsDeleteConfirmModalOpen(true);
          setSelectedBookmarkId(null);
          setMultiSelectedBookmarkIds([]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bookmarks, selectedBookmarkId, multiSelectedBookmarkIds, isModalOpen, isImportExportModalOpen, isDeleteConfirmModalOpen, isHelpModalOpen]);

  // Agent engine (pluggable LLM)
  const agentEngine = async (userQuery) => {
    if (!userQuery.trim()) return;
    setIsProcessing(true);
    setBookmarksToDelete([]);
  const prompt = `You are an agent for a bookmark application. Based on the user's input, determine which application action(s) to take. For simple queries, return a single JSON object. For combined or sequential queries, return an array of action objects. Assign each action a numeric "priority" (lower executes earlier). The executor will sort actions by this priority and ignore array order.

    User Query: "${userQuery}"

    Available Actions:
    - searchBookmarks: General search by term (parameters: {searchTerm: string})
    - showAllBookmarks: Display all bookmarks (no parameters)
    - resetSearch: Clear all filters and show all bookmarks (no parameters)
    - importBookmarks: Open import/export modal (no parameters)
    - exportBookmarks: Open import/export modal (no parameters)
    - removeDuplicates: Remove duplicate bookmarks by title and URL (no parameters)
  - findIncludes: Find by field containing value (parameters: {field: "title"|"url"|"description"|"tags", value: string})
  - findStartsWith: Find by field starting with a value (parameters: {field: "title"|"url"|"description"|"tags", value: string})
    - findWithTags: Find bookmarks with specific tags (parameters: {includeTags: string[], excludeTags?: string[]})
    - filterByRating: Filter bookmarks by rating (parameters: {minRating?: number, maxRating?: number, comparator?: "gte"|"lte"|"eq", exact?: number})
  - sortBookmarks: Sort bookmarks by a specific field and order (parameters: {sortBy: "title"|"rating"|"url"|"folder"|"createdAt"|"updatedAt", order: "asc"|"desc"})
  - limitResults: Limit the number of results (parameters: {count: number, direction?: "first"|"last", scope?: "current"|"all"})
  - limitFirst: Show the first N from the entire set (parameters: {count: number})
  - limitLast: Show the last N from the entire set (parameters: {count: number})
    - reorder: Persist order across ALL bookmarks (parameters: {sortBy: "title"|"rating"|"url"|"folder", order: "asc"|"desc"})
    - reorderAscending: Persist ascending order across ALL bookmarks (optional parameters: {sortBy})
    - reorderDescending: Persist descending order across ALL bookmarks (optional parameters: {sortBy})
    - persistSortedOrder: Persist order across ALL bookmarks (parameters: {sortBy?: "title"|"rating"|"url"|"folder", order: "asc"|"desc"})
    - help: Show available commands and usage (no parameters)

  Priority should be set to match the order of the user's request.
  Example:
     Input: show first 10 in descending order
     Output: [
      { "action": "limitFirst", "parameters": { "count": 10 }, "priority": 3 },
      { "action": "sortBookmarks", "parameters": { "sortBy": "title", "order": "desc" }, "priority": 2 }
     ]

  Output schema: For each action, include: { "action": string, "parameters": object, "priority": number }.

  Respond with ONLY a JSON object or an array of JSON objects, wrapped in a markdown code block. Do not include any other text or formatting.`;

  // Create LLM using runtime-selected provider and runtime options
  const provider = runtimeProvider || (typeof __llm_provider__ !== 'undefined' && __llm_provider__) || LLM_PROVIDERS.GEMINI;
  const globalOpts = (typeof __llm_options__ !== 'undefined' && __llm_options__) || {};
  const runtimeOpts = (runtimeProviderOptions && runtimeProviderOptions[provider]) || {};
  const options = { ...globalOpts, ...runtimeOpts };
  const llm = createLLM(provider, options);

  // Removed quick natural-language pre-parsing to always defer to the LLM for interpretation.

    // Helper: extract JSON payload from text (supports fenced code blocks)
    const extractJsonFromText = (text) => {
      if (!text) return null;
      // Prefer ```json fenced blocks, but also allow generic ``` fences
      const fence = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
      if (fence) return fence[1];
      // If the whole text is likely JSON, return as-is
      const trimmed = text.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return trimmed;
      }
      return null;
    };

    try {
      const responseText = await llm.generate(prompt);
      if (!responseText) throw new Error('No valid response from LLM.');
      const extracted = extractJsonFromText(responseText) || responseText;
      let parsed;
      try {
        parsed = JSON.parse(extracted);
      } catch (e) {
        // If the provider accidentally returned a full API wrapper (e.g., Gemini JSON), try to dig out the text
        try {
          const wrapper = JSON.parse(responseText);
          const innerText = wrapper?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const innerExtracted = extractJsonFromText(innerText) || innerText;
          parsed = JSON.parse(innerExtracted);
        } catch (_) {
          throw e;
        }
      }
  // Use the LLM's JSON directly. Expect an object or array of { action, parameters?, priority? }.
  const stepsArray = Array.isArray(parsed) ? parsed : [parsed];
  const steps = stepsArray.filter((s) => s && typeof s === 'object' && typeof s.action === 'string');
  if (steps.length === 0) throw new Error('Unable to interpret agent response.');
  // Stack: append to previous plan unless reset/show-all is present
  const previous = Array.isArray(lastAction) ? lastAction : lastAction ? [lastAction] : [];
  const containsReset = steps.some(s => ['resetSearch','showAllBookmarks'].includes(s.action));
  const combined = containsReset ? steps : [...previous, ...steps];
  setLastAction(combined.length === 1 ? combined[0] : combined);
  const actions = combined;
  for (const step of steps) {
        if (step.action === 'help') setIsHelpModalOpen(true);
        if (step.action === 'importBookmarks' || step.action === 'exportBookmarks') setIsImportExportModalOpen(true);
        if (step.action === 'removeDuplicates') {
          const listToScan = applyAgentPlan(actions, bookmarks);
          const ids = findDuplicateIds(listToScan);
          if (ids.length > 0) { setBookmarksToDelete(ids); setIsDeleteConfirmModalOpen(true); }
          else showCustomMessage('No duplicate bookmarks found in the current view.', 'info');
        }
        if (['reorder', 'reorderAscending', 'reorderDescending', 'persistSortedOrder'].includes(step.action)) {
          await handlePersistReorderFromAgent(step);
        }
      }
    } catch (error) {
      console.error('Agent engine error:', error);
      setLastAction({ action: 'error', parameters: {}, reasoning: `Failed to process request: ${error.message}` });
      showCustomMessage(`Failed to process request via LLM: ${error.message}. Performing a general search instead. Check API key is set in options.`, 'error');
      setLastAction({ action: 'searchBookmarks', parameters: { searchTerm: userQuery }, reasoning: 'Fallback search due to agent error.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSearch = () => {
    setLastAction(null);
    setSelectedBookmarkId(null);
    setBookmarksToDelete([]);
  };

  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = (searchQuery || '').trim().toLowerCase();
      if (q === 'options') {
        setIsOptionsOpen(true);
        return;
      }
      agentEngine(searchQuery);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-10" role="banner">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="sr-only">Bookmark Manager</h1>
          <div className="flex justify-center items-center space-x-2">
            <div className="relative w-full max-w-md">
              <input
                id="search-input"
                type="text"
                placeholder="Type natural language queries (e.g., 'find github')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchInputKeyDown}
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isProcessing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              )}
            </div>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Help"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 115.82 1c-.44.86-1.26 1.3-1.91 1.63-.51.26-.75.52-.75.87v.5"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>
          <div className="flex justify-center items-center mt-2 space-x-2">
            <button onClick={handleAddNewBookmark} className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Add New</button>
            <button onClick={handleImportExportOpen} className="px-3 py-1 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600">Import/Export</button>
            <button onClick={handleRemoveDuplicates} className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600">Remove Duplicates</button>
            {lastAction && <button onClick={resetSearch} className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600">Clear Search</button>}
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Click to select, <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Shift</kbd>+click to open, double-click or <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">E</kbd> to edit.
          </div>
        </div>
      </header>

      <main className="pt-28 pb-8" role="main">
        <div className="max-w-4xl mx-auto px-4">
          {lastAction && (
            <div className={`mb-4 p-3 rounded-lg ${lastAction.action === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`} role="status">
              {Array.isArray(lastAction) ? (
                <>
                  <p className="text-sm text-green-800 font-bold">Agent Plan:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    {lastAction.map((step, idx) => (
                      <li key={idx} className="text-sm text-green-800">
                        <strong>{step.action}</strong>
                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <span className="ml-2 font-mono text-xs text-green-600">({Object.entries(step.parameters).map(([k, v]) => `${k}: "${v}` + '"').join(', ')})</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <p className={`text-sm ${lastAction.action === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                    <strong>Agent Action:</strong> {lastAction.action}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="text-right text-sm text-gray-600 mb-4">
            {multiSelectedBookmarkIds.length > 0 ? `${multiSelectedBookmarkIds.length} selected | ${displayedBookmarks.length} total` : selectedBookmarkId ? `1 selected | ${displayedBookmarks.length} total` : `${displayedBookmarks.length} total bookmarks`}
          </div>
          <div className="space-y-2" role="list" aria-label="Bookmarks">
            {displayedBookmarks.length > 0 ? (
              displayedBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`relative rounded-lg border p-4 transition-all duration-200 cursor-pointer ${
                    bookmarksToDelete.includes(bookmark.id) ? 'bg-red-50 border-red-300' :
                    multiSelectedBookmarkIds.includes(bookmark.id) ? 'bg-blue-100 border-blue-400' :
                    selectedBookmarkId === bookmark.id ? 'bg-blue-50 border-blue-400' :
                    (bookmark.urlStatus === 'invalid' || bookmark.unreachable) ? 'bg-yellow-100 border-yellow-300' :
                    'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  role="listitem"
                  aria-selected={selectedBookmarkId === bookmark.id || multiSelectedBookmarkIds.includes(bookmark.id)}
                  tabIndex={0}
                  onClick={(e) => handleBookmarkClick(bookmark, e)}
                  onDoubleClick={() => handleBookmarkDoubleClick(bookmark)}
                  onKeyDown={(e) => handleBookmarkKeyDown(e, bookmark)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                      <img src={bookmark.faviconUrl || `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`} alt="" className="w-full h-full object-contain rounded" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/f0f0f0/999999?text=?'; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">{bookmark.title}</h3>
                      <p className="text-sm text-blue-600 hover:text-blue-800 truncate">{bookmark.url}</p>
                      {bookmark.description && <p className="text-sm text-gray-600 mt-1">{bookmark.description}</p>}
                      {bookmark.rating > 0 && <div className="text-xs text-yellow-400 mt-1">{'★'.repeat(bookmark.rating)}{'☆'.repeat(5 - bookmark.rating)}</div>}
                      {bookmark.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmark.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{lastAction ? 'No bookmarks found matching your criteria.' : 'No bookmarks yet. Add some or import them!'}</p>
                {lastAction && <button onClick={resetSearch} className="mt-2 text-blue-600 hover:underline text-sm">Clear search</button>}
              </div>
            )}
          </div>
        </div>
      </main>

      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
      {isOptionsOpen && (
        <OptionsModal
          provider={runtimeProvider}
          providerOptions={runtimeProviderOptions[runtimeProvider] || {}}
          onChange={(val) => {
            const v = (val || '').toString().toLowerCase();
            setRuntimeProvider(v);
            try { localStorage.setItem('bm_runtime_llm_provider', v); } catch {}
          }}
          onChangeOptions={(opts) => {
            setRuntimeProviderOptions((prev) => {
              const next = { ...(prev || {}), [runtimeProvider]: { ...(prev?.[runtimeProvider] || {}), ...(opts || {}) } };
              try { localStorage.setItem('bm_runtime_llm_options', JSON.stringify(next)); } catch {}
              return next;
            });
          }}
          onClose={() => setIsOptionsOpen(false)}
        />
      )}
      {isMessageModalOpen && (
        <MessageModal message={messageModalContent.message} type={messageModalContent.type} onClose={() => setIsMessageModalOpen(false)} />
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 max-h-[90vh] overflow-y-auto">
            <BookmarkForm
              bookmark={editingBookmark}
              onClose={() => setIsModalOpen(false)}
              onSave={async (b) => { await saveBookmark(b); setIsModalOpen(false); }}
              onDelete={async (id) => { await deleteBookmark(id); setIsModalOpen(false); }}
              fetchUrlStatus={fetchUrlStatus}
            />
          </div>
        </div>
      )}
      {isImportExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && handleImportExportClose()}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
            <ImportExportContent
              bookmarks={bookmarks}
              onClose={handleImportExportClose}
              onImportJson={async (arr) => { await saveAllBookmarks(arr); handleImportExportClose(); setLastAction(null); }}
              onImportHtml={async (html) => {
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, 'text/html');
                  const bookmarkLinks = doc.querySelectorAll('a[href]');
                  const importedBookmarks = Array.from(bookmarkLinks).map(link => {
                    let folderId = 'imported';
                    const parentH3 = link.closest('dl')?.previousElementSibling;
                    if (parentH3?.tagName === 'H3') folderId = parentH3.textContent.trim().toLowerCase().replace(/\s+/g, '-');
                    return {
                      title: link.textContent.trim() || link.href,
                      url: link.href,
                      description: link.getAttribute('description') || '',
                      tags: [],
                      rating: 0,
                      folderId,
                      faviconUrl: link.getAttribute('icon') || '',
                      createdAt: link.getAttribute('add_date') ? new Date(parseInt(link.getAttribute('add_date')) * 1000).toISOString() : new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                  });
                  if (importedBookmarks.length > 0) {
                    await saveAllBookmarks(importedBookmarks);
                    setLastAction(null);
                  } else {
                    showCustomMessage('No bookmarks found in the imported HTML.', 'info');
                  }
                } catch (e) {
                  console.error('Error parsing HTML bookmarks:', e);
                  showCustomMessage('Failed to parse HTML bookmarks.', 'error');
                } finally {
                  handleImportExportClose();
                }
              }}
              showMessage={showCustomMessage}
            />
          </div>
        </div>
      )}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && handleCancelDelete()}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <DeleteConfirmModal
              message={`Are you sure you want to delete ${bookmarksToDelete.length} bookmark(s)?`}
              onConfirm={handleConfirmDelete}
              onCancel={handleCancelDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarkApp;
