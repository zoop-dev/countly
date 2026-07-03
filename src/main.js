

import './style.css'
import '@material/web/icon/icon.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/fab/fab.js'
import '@material/web/dialog/dialog.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import { initInstallGate } from 'zoop-kit/install-gate.js'
import { attachBootLoader, removeBootLoaderImmediately } from 'zoop-kit/boot-loader.js'
import { zkConfirm, zkPrompt } from 'zoop-kit/dialogs.js'
import { showToast } from 'zoop-kit/toast.js'
import { initUpdateCheck, checkForUpdate } from 'zoop-kit/update-check.js'
import { maybeShowChangelog, showFullChangelog } from 'zoop-kit/changelog.js'
import { initDesktopWarning } from 'zoop-kit/desktop-warning.js'
import { showAppSwitcher } from 'zoop-kit/app-switcher.js'
import { initSavedTheme, showThemePicker } from 'zoop-kit/theme-picker.js'
import { showDatePicker, showTimePicker } from 'zoop-kit/date-time-picker.js'
import { wireDragList, DRAG_HANDLE_SVG } from 'zoop-kit/drag-list.js'
import confetti from 'canvas-confetti'
import { APP_VERSION, CHANGELOG } from './changelog.js'

const EVENTS_KEY = 'countly:events'
const VERSION_KEY = 'countly:version'
const THEME_KEY = 'countly:theme'

const COLORS = ['#ff6a6a', '#ff9f5a', '#ffd76a', '#5ee0a0', '#4cc9ff', '#b28dff', '#ff6ad5']
const ICONS = ['🎉', '🎂', '✈️', '📌', '🎓', '💍', '🎄', '🏖️', '❤️', '🚀', '🏆', '🎮']

const REPEAT_OPTIONS = [
  { key: 'none', label: 'Does not repeat' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly (birthday)' },
]
function repeatLabel(key) {
  return REPEAT_OPTIONS.find((o) => o.key === key)?.label || 'Does not repeat'
}

const THEMES = {
  sunset: { accent: '#ff6a6a', accentOn: '#2a0505', grad: '#1a0505 0%, #3a0f0f 55%, #c22e2e 100%' },
  purple: { accent: '#b28dff', accentOn: '#1a1023', grad: '#150a2e 0%, #2c1359 55%, #6a2fd0 100%' },
  blue: { accent: '#4cc9ff', accentOn: '#04121c', grad: '#0a1330 0%, #123a63 55%, #1c6fd0 100%' },
  green: { accent: '#2be675', accentOn: '#05170d', grad: '#06170f 0%, #0d3324 55%, #1ed760 100%' },
  pink: { accent: '#ff6ad5', accentOn: '#26041b', grad: '#1f0518 0%, #430e34 55%, #c22e93 100%' },
}

let currentThemeKey = initSavedTheme(THEME_KEY, THEMES, 'sunset')

function uid() {
  return crypto.randomUUID()
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY)) || []
  } catch {
    return []
  }
}
function saveEvents(list) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list))
}

if (
  initInstallGate({
    appName: 'Countly',
    iconUrl: '/icons/icon-192.png',
    subtitle: 'countdowns to birthdays, trips, and deadlines. no account, no permissions.',
  })
) {
  removeBootLoaderImmediately()
} else {
  attachBootLoader(() => {
    renderApp()
    initDesktopWarning('countly:desktop-warning-dismissed')
    initUpdateCheck()
    maybeShowChangelog({
      appVersion: APP_VERSION,
      changelog: CHANGELOG,
      versionKey: VERSION_KEY,
      isFirstRun: loadEvents().length === 0,
    })
  })
}



function nextOccurrence(ev) {
  const [y, m, d] = ev.date.split('-').map(Number)
  const [hh, mm] = (ev.time || '00:00').split(':').map(Number)
  let target = new Date(y, m - 1, d, hh, mm)
  const repeat = ev.repeat || (ev.repeatYearly ? 'yearly' : 'none')

  if (repeat !== 'none') {
    const now = new Date()
    while (target.getTime() < now.getTime()) {
      if (repeat === 'daily') target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1, hh, mm)
      else if (repeat === 'weekly') target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 7, hh, mm)
      else if (repeat === 'monthly') target = new Date(target.getFullYear(), target.getMonth() + 1, target.getDate(), hh, mm)
      else target = new Date(target.getFullYear() + 1, target.getMonth(), target.getDate(), hh, mm)
    }
  }
  return target
}

function isSameCalendarDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}




function getDuration(from, to) {
  let years = to.getFullYear() - from.getFullYear()
  let months = to.getMonth() - from.getMonth()
  let days = to.getDate() - from.getDate()
  let hours = to.getHours() - from.getHours()
  let minutes = to.getMinutes() - from.getMinutes()
  let seconds = to.getSeconds() - from.getSeconds()

  if (seconds < 0) {
    seconds += 60
    minutes--
  }
  if (minutes < 0) {
    minutes += 60
    hours--
  }
  if (hours < 0) {
    hours += 24
    days--
  }
  if (days < 0) {
    const daysInPrevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate()
    days += daysInPrevMonth
    months--
  }
  if (months < 0) {
    months += 12
    years--
  }

  return { years, months, days, hours, minutes, seconds }
}

const UNIT_LABELS = {
  years: 'year',
  months: 'month',
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  seconds: 'second',
}

function pluralize(n, unit) {
  return `${n} ${UNIT_LABELS[unit]}${n === 1 ? '' : 's'}`
}



function formatRemaining(from, to) {
  const past = to.getTime() < from.getTime()
  const duration = past ? getDuration(to, from) : getDuration(from, to)
  const order = ['years', 'months', 'days', 'hours', 'minutes', 'seconds']
  const nonZero = order.filter((u) => duration[u] > 0)

  if (!nonZero.length) return { value: 0, unit: 'seconds', secondaryValue: null, secondaryUnit: null, past, duration }

  const primary = nonZero[0]
  const secondary = nonZero[1] || null
  return {
    value: duration[primary],
    unit: primary,
    secondaryValue: secondary ? duration[secondary] : null,
    secondaryUnit: secondary,
    past,
    duration,
  }
}


function formatFullDurationHTML(duration) {
  const order = ['years', 'months', 'days', 'hours', 'minutes', 'seconds']
  
  
  
  const firstNonZero = order.findIndex((u) => duration[u] > 0)
  const parts = order.slice(firstNonZero === -1 ? order.length - 1 : firstNonZero)
  return parts
    .map(
      (u) => `
        <div class="full-countdown-chip">
          <span class="full-countdown-chip-value">${duration[u] || 0}</span>
          <span class="full-countdown-chip-label">${UNIT_LABELS[u]}${duration[u] === 1 ? '' : 's'}</span>
        </div>
      `
    )
    .join('')
}

function renderApp() {
  const app = document.querySelector('#app')
  app.innerHTML = `
    <div class="topbar"><p class="topbar-title">Countly</p></div>
    <div style="padding:0 18px;">
      <div id="events-list"></div>
      <button type="button" class="add-btn" id="new-event-btn" style="margin-top:8px;">
        <md-icon>add</md-icon> New countdown
      </button>
    </div>

    <md-dialog id="event-dialog" class="event-dialog">
      <div slot="headline" id="event-dialog-title">New countdown</div>
      <div slot="content">
        <p class="dialog-section-label">Icon</p>
        <div class="swatch-row" id="event-icon-row"></div>

        <p class="dialog-section-label">Name</p>
        <div class="name-input-row">
          <input id="event-name-input" type="text" placeholder="What's it for?" autocomplete="off" />
        </div>

        <p class="dialog-section-label">When</p>
        <div class="date-time-btn-row">
          <button type="button" class="date-picker-btn" id="event-date-btn">
            <md-icon>calendar_month</md-icon>
            <span id="event-date-btn-label">Pick a date</span>
          </button>
          <button type="button" class="date-picker-btn" id="event-time-btn">
            <md-icon>schedule</md-icon>
            <span id="event-time-btn-label">No time</span>
          </button>
          <md-icon-button id="event-time-clear-btn" style="display:none" aria-label="Clear time">
            <md-icon>close</md-icon>
          </md-icon-button>
        </div>
        <p class="dialog-section-label">Repeat</p>
        <button type="button" class="date-picker-btn" id="event-repeat-btn">
          <md-icon>repeat</md-icon>
          <span id="event-repeat-btn-label">Does not repeat</span>
        </button>

        <p class="dialog-section-label">Color</p>
        <div class="swatch-row" id="event-color-row"></div>
        <input type="color" id="event-color-custom-input" style="display:none" />

        <p class="dialog-section-label">Description (optional)</p>
        <div class="name-input-row">
          <textarea id="event-description-input" placeholder="Any extra details…" rows="2"></textarea>
        </div>
      </div>
      <div slot="actions">
        <md-text-button id="event-delete-btn" style="display:none; margin-right:auto; color:#ff6a6a;">Delete</md-text-button>
        <md-text-button id="event-cancel-btn">Cancel</md-text-button>
        <md-filled-button id="event-save-btn">Save</md-filled-button>
      </div>
    </md-dialog>

    <md-dialog id="repeat-dialog">
      <div slot="headline">Repeat</div>
      <div slot="content">
        <md-list id="repeat-options-list"></md-list>
      </div>
      <div slot="actions">
        <md-text-button id="repeat-dialog-close">Close</md-text-button>
      </div>
    </md-dialog>

    <md-dialog id="share-preview-dialog" class="share-preview-dialog">
      <div slot="headline">Share</div>
      <div slot="content">
        <div class="share-preview-canvas-wrap">
          <canvas id="share-preview-canvas" width="1000" height="1000"></canvas>
        </div>
        <div class="share-style-row" id="share-style-row"></div>
      </div>
      <div slot="actions">
        <md-text-button id="share-preview-cancel">Cancel</md-text-button>
        <md-filled-button id="share-preview-confirm">
          <md-icon slot="icon">ios_share</md-icon>
          Share
        </md-filled-button>
      </div>
    </md-dialog>

    <md-fab id="settings-fab" class="settings-fab" aria-label="Settings">
      <md-icon slot="icon">settings</md-icon>
    </md-fab>

    <md-dialog id="settings-dialog" class="settings-dialog">
      <div slot="headline">Settings</div>
      <div slot="content">
        <md-list>
          <md-list-item type="button" id="settings-check-update">
            <md-icon slot="start">refresh</md-icon>
            <div slot="headline">Check for updates</div>
            <div slot="supporting-text">v${APP_VERSION}</div>
          </md-list-item>
          <md-list-item type="button" id="settings-changelog">
            <md-icon slot="start">campaign</md-icon>
            <div slot="headline">Changelog</div>
          </md-list-item>
          <md-list-item type="button" id="settings-theme">
            <md-icon slot="start">palette</md-icon>
            <div slot="headline">Theme</div>
            <div slot="supporting-text">${currentThemeKey}</div>
          </md-list-item>
          <md-list-item type="button" id="settings-share">
            <md-icon slot="start">ios_share</md-icon>
            <div slot="headline">Share app</div>
          </md-list-item>
          <md-list-item type="button" id="settings-other-apps">
            <md-icon slot="start">apps</md-icon>
            <div slot="headline">Other apps by me</div>
          </md-list-item>
          <md-list-item type="button" id="settings-github">
            <md-icon slot="start">code</md-icon>
            <div slot="headline">View source</div>
            <div slot="supporting-text">github.com/zoop-dev/countly</div>
          </md-list-item>
          <md-list-item type="button" id="settings-clear-data">
            <md-icon slot="start">delete_sweep</md-icon>
            <div slot="headline">Clear all data</div>
          </md-list-item>
        </md-list>
      </div>
      <div slot="actions">
        <md-text-button id="settings-close">Close</md-text-button>
      </div>
    </md-dialog>
  `

  initEventsList()
  initSettings()

  setInterval(updateAllCountdownTexts, 1000)
}

let editingId = null
const expandedIds = new Set()
let pendingDate = ''
let pendingTime = ''
let pendingRepeat = 'none'
let pendingColor = COLORS[0]
let pendingCustomColor = null
let pendingIcon = ''

function renderIconRow() {
  const row = document.querySelector('#event-icon-row')
  row.innerHTML =
    `<button type="button" class="icon-swatch icon-swatch-none${!pendingIcon ? ' selected' : ''}" data-icon="" aria-label="No icon">
      <md-icon>block</md-icon>
    </button>` +
    ICONS.map((i) => `<button type="button" class="icon-swatch${i === pendingIcon ? ' selected' : ''}" data-icon="${i}">${i}</button>`).join('') +
    `<button type="button" class="icon-swatch icon-swatch-custom${pendingIcon && !ICONS.includes(pendingIcon) ? ' selected' : ''}" id="event-icon-custom-btn">
      ${pendingIcon && !ICONS.includes(pendingIcon) ? pendingIcon : '<md-icon>add</md-icon>'}
    </button>`

  row.querySelectorAll('.icon-swatch[data-icon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingIcon = btn.dataset.icon
      renderIconRow()
    })
  })
  document.querySelector('#event-icon-custom-btn').addEventListener('click', async () => {
    const val = await zkPrompt('', { title: 'Custom icon', placeholder: 'Paste any emoji…', defaultValue: !ICONS.includes(pendingIcon) ? pendingIcon : '' })
    if (val?.trim()) {
      pendingIcon = val.trim()
      renderIconRow()
    }
  })
}

function renderColorRow() {
  const row = document.querySelector('#event-color-row')
  row.innerHTML =
    COLORS.map((c) => `<button type="button" class="swatch${c === pendingColor ? ' selected' : ''}" data-color="${c}" style="background:${c}"></button>`).join('') +
    `<button type="button" class="swatch swatch-custom${pendingCustomColor && pendingCustomColor === pendingColor ? ' selected' : ''}" id="event-color-custom-btn" style="${pendingCustomColor ? `background:${pendingCustomColor}` : ''}" aria-label="Custom color">
      ${pendingCustomColor ? '' : '<md-icon>palette</md-icon>'}
    </button>`

  row.querySelectorAll('.swatch[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingColor = btn.dataset.color
      renderColorRow()
    })
  })
  document.querySelector('#event-color-custom-btn').addEventListener('click', () => {
    document.querySelector('#event-color-custom-input').click()
  })
}

function updateDateBtnLabel() {
  const dateLabel = document.querySelector('#event-date-btn-label')
  if (!pendingDate) {
    dateLabel.textContent = 'Pick a date'
  } else {
    const [y, m, d] = pendingDate.split('-').map(Number)
    dateLabel.textContent = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const timeLabel = document.querySelector('#event-time-btn-label')
  const clearBtn = document.querySelector('#event-time-clear-btn')
  if (!pendingTime) {
    timeLabel.textContent = 'No time'
    clearBtn.style.display = 'none'
  } else {
    const [hh, mm] = pendingTime.split(':').map(Number)
    timeLabel.textContent = new Date(2000, 0, 1, hh, mm).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    clearBtn.style.display = ''
  }

  document.querySelector('#event-repeat-btn-label').textContent = repeatLabel(pendingRepeat)
}

function showRepeatPicker(currentKey, onSelect) {
  const dialog = document.querySelector('#repeat-dialog')
  document.querySelector('#repeat-options-list').innerHTML = REPEAT_OPTIONS.map(
    (o) => `
      <md-list-item type="button" class="repeat-option-item" data-key="${o.key}">
        <div slot="headline">${o.label}</div>
        ${o.key === currentKey ? '<md-icon slot="end">check</md-icon>' : ''}
      </md-list-item>
    `
  ).join('')
  document.querySelectorAll('.repeat-option-item').forEach((item) => {
    item.addEventListener('click', () => {
      onSelect(item.dataset.key)
      dialog.close()
    })
  })
  document.querySelector('#repeat-dialog-close').addEventListener('click', () => dialog.close(), { once: true })
  dialog.show()
}

function initEventsList() {
  renderEventsList()

  
  
  document.querySelector('#events-list').addEventListener('click', (e) => {
    const badge = e.target.closest('.event-card-today-badge')
    if (!badge) return
    e.stopPropagation()
    const rect = badge.getBoundingClientRect()
    confetti({
      particleCount: 70,
      spread: 75,
      startVelocity: 35,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: COLORS,
    })
  })

  document.querySelector('#new-event-btn').addEventListener('click', () => openEventDialog(null))

  const dialog = document.querySelector('#event-dialog')
  document.querySelector('#event-cancel-btn').addEventListener('click', () => dialog.close())

  document.querySelector('#event-color-custom-input').addEventListener('input', (e) => {
    pendingCustomColor = e.target.value
    pendingColor = pendingCustomColor
    renderColorRow()
  })

  document.querySelector('#event-repeat-btn').addEventListener('click', () => {
    showRepeatPicker(pendingRepeat, (key) => {
      pendingRepeat = key
      updateDateBtnLabel()
    })
  })

  document.querySelector('#event-date-btn').addEventListener('click', () => {
    showDatePicker({
      initialDate: pendingDate,
      title: 'Pick a date',
      onConfirm: (date) => {
        pendingDate = date
        updateDateBtnLabel()
      },
    })
  })

  document.querySelector('#event-time-btn').addEventListener('click', () => {
    showTimePicker({
      initialTime: pendingTime,
      title: 'Pick a time',
      onConfirm: (time) => {
        pendingTime = time
        updateDateBtnLabel()
      },
    })
  })

  document.querySelector('#event-time-clear-btn').addEventListener('click', () => {
    pendingTime = ''
    updateDateBtnLabel()
  })

  document.querySelector('#event-save-btn').addEventListener('click', () => {
    const name = document.querySelector('#event-name-input').value.trim()
    const description = document.querySelector('#event-description-input').value.trim()
    const repeat = pendingRepeat
    const color = pendingColor
    const icon = pendingIcon

    if (!name || !pendingDate) {
      showToast('give it a name and a date')
      return
    }

    const events = loadEvents()
    if (editingId) {
      const ev = events.find((e) => e.id === editingId)
      delete ev.repeatYearly
      Object.assign(ev, { name, description, date: pendingDate, time: pendingTime, repeat, color, icon })
    } else {
      events.push({ id: uid(), name, description, date: pendingDate, time: pendingTime, repeat, color, icon, pinned: false })
    }
    saveEvents(events)
    dialog.close()
    renderEventsList()
  })

  document.querySelector('#event-delete-btn').addEventListener('click', () => {
    deleteEventWithUndo(editingId)
    dialog.close()
  })
}

function openEventDialog(id) {
  editingId = id
  const dialog = document.querySelector('#event-dialog')
  const nameInput = document.querySelector('#event-name-input')
  const deleteBtn = document.querySelector('#event-delete-btn')
  const title = document.querySelector('#event-dialog-title')

  if (id) {
    const ev = loadEvents().find((e) => e.id === id)
    title.textContent = 'Edit countdown'
    nameInput.value = ev.name
    document.querySelector('#event-description-input').value = ev.description || ''
    pendingDate = ev.date
    pendingTime = ev.time || ''
    pendingRepeat = ev.repeat || (ev.repeatYearly ? 'yearly' : 'none')
    pendingColor = ev.color
    pendingCustomColor = COLORS.includes(ev.color) ? null : ev.color
    pendingIcon = ev.icon || ''
    deleteBtn.style.display = ''
  } else {
    title.textContent = 'New countdown'
    nameInput.value = ''
    document.querySelector('#event-description-input').value = ''
    pendingDate = ''
    pendingTime = ''
    pendingRepeat = 'none'
    pendingColor = COLORS[0]
    pendingCustomColor = null
    pendingIcon = ''
    deleteBtn.style.display = 'none'
  }
  renderColorRow()
  renderIconRow()
  updateDateBtnLabel()

  dialog.show()
}

function renderEventsList() {
  const list = document.querySelector('#events-list')
  const events = loadEvents()

  if (!events.length) {
    list.innerHTML = `<div class="empty-hint">no countdowns yet — add one</div>`
    return
  }

  
  const withDates = events
    .map((ev, i) => ({ ev, i, target: nextOccurrence(ev) }))
    .sort((a, b) => (b.ev.pinned ? 1 : 0) - (a.ev.pinned ? 1 : 0) || a.i - b.i)

  list.innerHTML = withDates
    .map(({ ev, target }) => {
      const { value, unit, secondaryValue, secondaryUnit, past, duration } = formatRemaining(new Date(), target)
      const isToday = past && isSameCalendarDate(target, new Date())
      const repeat = ev.repeat || (ev.repeatYearly ? 'yearly' : 'none')
      const expanded = expandedIds.has(ev.id)
      return `
        <div class="event-card${isToday ? ' event-card-today' : ''}" data-id="${ev.id}" style="--card-color:${ev.color}">
          <div class="event-card-row">
            ${ev.pinned ? `<span class="zk-drag-handle zk-drag-handle-disabled">${DRAG_HANDLE_SVG}</span>` : `<span class="zk-drag-handle">${DRAG_HANDLE_SVG}</span>`}
            ${ev.icon ? `<span class="event-card-icon">${ev.icon}</span>` : ''}
            <div class="event-card-info">
              <p class="event-card-name">${ev.name}</p>
              <p class="event-card-date">${target.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${repeat !== 'none' ? ` · ${repeatLabel(repeat).toLowerCase()}` : ''}</p>
            </div>
            <div class="event-card-countdown" data-target="${target.getTime()}">
              ${countdownHTML(isToday, value, unit, secondaryValue, secondaryUnit, past)}
            </div>
            <md-icon-button class="event-card-pin${ev.pinned ? ' pinned' : ''}" data-id="${ev.id}" aria-label="Pin"><md-icon>push_pin</md-icon></md-icon-button>
          </div>
          <div class="event-card-expand${expanded ? ' open' : ''}" id="expand-${ev.id}">
            <div class="event-card-expand-inner">
              <div class="expand-top-row">
                ${
                  isToday
                    ? `<p class="event-card-full-countdown-today">🎉 it's today!</p>`
                    : `<div class="full-countdown-row" data-target="${target.getTime()}">${formatFullDurationHTML(duration)}</div>`
                }
                <div class="event-card-expand-actions">
                  <button type="button" class="event-card-edit-btn" data-id="${ev.id}">Edit</button>
                  <button type="button" class="event-card-edit-btn event-card-share-btn" data-id="${ev.id}">Share</button>
                </div>
              </div>
              ${!isToday && past ? '<p class="full-countdown-ago">ago</p>' : ''}
              ${ev.description ? `<p class="event-card-description">${ev.description}</p>` : ''}
            </div>
          </div>
        </div>
      `
    })
    .join('')

  list.querySelectorAll('.event-card-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.zk-drag-handle') || e.target.closest('.event-card-pin')) return
      const id = row.closest('.event-card').dataset.id
      toggleExpand(id)
    })
  })
  list.querySelectorAll('.event-card-pin').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const events = loadEvents()
      const ev = events.find((x) => x.id === btn.dataset.id)
      if (ev) ev.pinned = !ev.pinned
      saveEvents(events)
      renderEventsList()
    })
  })
  list.querySelectorAll('.event-card-edit-btn:not(.event-card-share-btn)').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      openEventDialog(btn.dataset.id)
    })
  })
  list.querySelectorAll('.event-card-share-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const ev = loadEvents().find((x) => x.id === btn.dataset.id)
      if (ev) openSharePreview(ev, nextOccurrence(ev))
    })
  })

  wireDragList({
    container: list,
    itemSelector: '.event-card',
    onReorder: (newOrder) => {
      const events = loadEvents()
      events.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id))
      saveEvents(events)
    },
  })
}

function countdownHTML(isToday, value, unit, secondaryValue, secondaryUnit, past) {
  if (isToday) return `<span class="event-card-today-badge">🎉 today</span>`
  const unitLabel = `${UNIT_LABELS[unit]}${value === 1 ? '' : 's'}`
  const secondary = secondaryValue ? `<span class="event-card-secondary">${pluralize(secondaryValue, secondaryUnit)}</span>` : ''
  return `<span class="event-card-value">${value}</span><span class="event-card-unit">${unitLabel}${past ? ' ago' : ''}</span>${secondary}`
}

function toggleExpand(id) {
  if (expandedIds.has(id)) expandedIds.delete(id)
  else expandedIds.add(id)
  document.querySelector(`#expand-${id}`)?.classList.toggle('open', expandedIds.has(id))
}



const SHARE_STYLES = [
  { key: 'gradient', label: 'Gradient' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'card', label: 'Card' },
]

function countdownLine(ev, target) {
  const { value, unit, secondaryValue, secondaryUnit, past } = formatRemaining(new Date(), target)
  const isToday = past && isSameCalendarDate(target, new Date())
  const big = isToday ? '🎉' : String(value)
  const line = isToday
    ? "it's today!"
    : `${UNIT_LABELS[unit]}${value === 1 ? '' : 's'}${secondaryValue ? ` ${secondaryValue} ${UNIT_LABELS[secondaryUnit]}${secondaryValue === 1 ? '' : 's'}` : ''}${past ? ' ago' : ''}`
  return { big, line }
}

function renderCountdownShareCanvas(ev, target, style = 'gradient') {
  const size = 1000
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (style === 'minimal') drawShareMinimal(ctx, ev, target, size)
  else if (style === 'card') drawShareCard(ctx, ev, target, size)
  else drawShareGradient(ctx, ev, target, size)

  return canvas
}

function drawShareGradient(ctx, ev, target, size) {
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, '#05060a')
  g.addColorStop(1, ev.color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  ctx.textAlign = 'center'

  if (ev.icon) {
    ctx.font = '150px sans-serif'
    ctx.fillText(ev.icon, size / 2, 260)
  }

  ctx.fillStyle = '#fff'
  ctx.font = '800 56px "Unbounded", sans-serif'
  wrapCanvasText(ctx, ev.name, size / 2, ev.icon ? 380 : 300, size - 160, 64)

  const { big, line } = countdownLine(ev, target)
  ctx.font = '800 170px "Unbounded", sans-serif'
  ctx.fillText(big, size / 2, 620)

  ctx.font = '600 42px "Space Grotesque", sans-serif'
  ctx.fillText(line, size / 2, 680)

  ctx.font = '400 30px "Space Grotesque", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(target.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), size / 2, 900)

  ctx.font = '700 26px "Unbounded", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText('COUNTLY', size / 2, 950)
}

function drawShareMinimal(ctx, ev, target, size) {
  ctx.fillStyle = '#05060a'
  ctx.fillRect(0, 0, size, size)

  ctx.textAlign = 'left'
  const pad = 90

  if (ev.icon) {
    ctx.font = '90px sans-serif'
    ctx.fillText(ev.icon, pad, 200)
  }

  ctx.fillStyle = ev.color
  ctx.font = '800 340px "Unbounded", sans-serif'
  const { big, line } = countdownLine(ev, target)
  ctx.fillText(big, pad, 560)

  ctx.fillStyle = '#fff'
  ctx.font = '600 50px "Space Grotesque", sans-serif'
  ctx.fillText(line, pad, 630)

  ctx.font = '800 54px "Unbounded", sans-serif'
  wrapCanvasText(ctx, ev.name, pad, 760, size - pad * 2, 62)

  ctx.font = '400 28px "Space Grotesque", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText(target.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), pad, size - 60)
}

function drawShareCard(ctx, ev, target, size) {
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, ev.color)
  g.addColorStop(1, '#05060a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const cardPad = 70
  const cardTop = 160
  const cardBottom = size - 160
  roundRect(ctx, cardPad, cardTop, size - cardPad * 2, cardBottom - cardTop, 36)
  ctx.fillStyle = '#fdfdfd'
  ctx.fill()

  ctx.textAlign = 'center'
  const cx = size / 2

  if (ev.icon) {
    ctx.font = '110px sans-serif'
    ctx.fillText(ev.icon, cx, cardTop + 170)
  }

  ctx.fillStyle = '#0a0a0f'
  ctx.font = '800 50px "Unbounded", sans-serif'
  wrapCanvasText(ctx, ev.name, cx, cardTop + (ev.icon ? 260 : 200), size - cardPad * 2 - 100, 58)

  const { big, line } = countdownLine(ev, target)
  ctx.fillStyle = ev.color
  ctx.font = '800 150px "Unbounded", sans-serif'
  ctx.fillText(big, cx, cardTop + 440)

  ctx.fillStyle = '#4a4a52'
  ctx.font = '600 36px "Space Grotesque", sans-serif'
  ctx.fillText(line, cx, cardTop + 495)

  ctx.font = '400 26px "Space Grotesque", sans-serif'
  ctx.fillStyle = '#8a8a92'
  ctx.fillText(target.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), cx, cardBottom - 40)

  ctx.font = '700 22px "Unbounded", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'center'
  ctx.fillText('COUNTLY', cx, size - 70)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
}

async function shareCountdownImage(ev, target, style) {
  await document.fonts.ready
  const canvas = renderCountdownShareCanvas(ev, target, style)

  canvas.toBlob(async (blob) => {
    const fileName = `${ev.name.trim().replace(/\s+/g, '-').toLowerCase() || 'countdown'}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: ev.name })
        return
      } catch {
        return
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    showToast('image downloaded')
  }, 'image/png')
}

let sharePreviewStyle = SHARE_STYLES[0].key

async function openSharePreview(ev, target) {
  await document.fonts.ready
  const dialog = document.querySelector('#share-preview-dialog')
  const previewCanvas = document.querySelector('#share-preview-canvas')
  const previewCtx = previewCanvas.getContext('2d')

  function drawPreview() {
    const source = renderCountdownShareCanvas(ev, target, sharePreviewStyle)
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    previewCtx.drawImage(source, 0, 0)
  }

  document.querySelector('#share-style-row').innerHTML = SHARE_STYLES.map(
    (s) => `<button type="button" class="share-style-btn${s.key === sharePreviewStyle ? ' active' : ''}" data-style="${s.key}">${s.label}</button>`
  ).join('')
  document.querySelectorAll('.share-style-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sharePreviewStyle = btn.dataset.style
      document.querySelectorAll('.share-style-btn').forEach((b) => b.classList.toggle('active', b === btn))
      drawPreview()
    })
  })

  drawPreview()

  document.querySelector('#share-preview-cancel').addEventListener('click', () => dialog.close(), { once: true })
  document.querySelector('#share-preview-confirm').addEventListener(
    'click',
    () => {
      dialog.close()
      shareCountdownImage(ev, target, sharePreviewStyle)
    },
    { once: true }
  )

  dialog.show()
}

function deleteEventWithUndo(id) {
  const events = loadEvents()
  const index = events.findIndex((e) => e.id === id)
  if (index === -1) return
  const [removed] = events.splice(index, 1)
  saveEvents(events)
  renderEventsList()

  showToast(`"${removed.name}" deleted`, {
    duration: 4000,
    action: {
      label: 'Undo',
      onClick: () => {
        const current = loadEvents()
        current.splice(index, 0, removed)
        saveEvents(current)
        renderEventsList()
      },
    },
  })
}

function updateAllCountdownTexts() {
  document.querySelectorAll('.event-card-countdown').forEach((el) => {
    const target = Number(el.dataset.target)
    const { value, unit, secondaryValue, secondaryUnit, past } = formatRemaining(new Date(), new Date(target))
    const isToday = past && isSameCalendarDate(new Date(target), new Date())
    el.innerHTML = countdownHTML(isToday, value, unit, secondaryValue, secondaryUnit, past)
    el.closest('.event-card')?.classList.toggle('event-card-today', isToday)
  })

  
  document.querySelectorAll('.event-card-expand.open .full-countdown-row').forEach((el) => {
    const target = Number(el.dataset.target)
    const { duration } = formatRemaining(new Date(), new Date(target))
    el.innerHTML = formatFullDurationHTML(duration)
  })
}

function initSettings() {
  const settingsFab = document.querySelector('#settings-fab')
  const settingsDialog = document.querySelector('#settings-dialog')

  settingsFab.addEventListener('click', () => settingsDialog.show())
  document.querySelector('#settings-close').addEventListener('click', () => settingsDialog.close())

  document.querySelector('#settings-check-update').addEventListener('click', async (e) => {
    const item = e.currentTarget
    item.classList.add('spinning')
    let found = false
    try {
      found = await checkForUpdate()
    } catch {
      
    }
    setTimeout(() => item.classList.remove('spinning'), 600)
    settingsDialog.close()
    if (!found) showToast("you're on the latest version")
  })

  document.querySelector('#settings-changelog').addEventListener('click', () => {
    settingsDialog.close()
    showFullChangelog(CHANGELOG)
  })

  document.querySelector('#settings-theme').addEventListener('click', () => {
    settingsDialog.close()
    showThemePicker(THEMES, currentThemeKey, (key) => {
      currentThemeKey = key
      const supportingText = document.querySelector('#settings-theme div[slot="supporting-text"]')
      if (supportingText) supportingText.textContent = key
    }, THEME_KEY)
  })

  document.querySelector('#settings-share').addEventListener('click', async () => {
    settingsDialog.close()
    const shareData = { title: 'Countly', text: 'countdowns to birthdays, trips, and deadlines', url: location.origin }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {}
    } else {
      await navigator.clipboard.writeText(location.origin)
      showToast('link copied')
    }
  })

  document.querySelector('#settings-other-apps').addEventListener('click', () => {
    settingsDialog.close()
    showAppSwitcher()
  })

  document.querySelector('#settings-github').addEventListener('click', () => {
    window.open('https://github.com/zoop-dev/countly', '_blank', 'noopener,noreferrer')
  })

  document.querySelector('#settings-clear-data').addEventListener('click', async () => {
    const ok = await zkConfirm('This removes every countdown. This can\'t be undone.', {
      title: 'Clear all data?',
      confirmLabel: 'Clear',
      destructive: true,
    })
    if (!ok) return
    localStorage.removeItem(EVENTS_KEY)
    settingsDialog.close()
    renderEventsList()
    showToast('cleared')
  })
}
