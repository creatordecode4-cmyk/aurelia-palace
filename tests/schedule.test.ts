// Guards the scene timing: no layer on screen outside its scene, and door 512 behaving as a far-away door
// that grows during the corridor walk and opens only at the end. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOOR512, WINDOWS, doorScreenHeight, inWindow } from '../components/three/schedule.ts'

test('the entrance doors are gone before the reception, key and corridor scenes', () => {
  for (const later of ['reception', 'key', 'corridor'] as const) {
    assert.ok(WINDOWS.doors[1] <= WINDOWS[later][0], `entrance doors overlap ${later}`)
  }
  for (let t = WINDOWS.corridor[0]; t < WINDOWS.corridor[1]; t += 0.05) assert.equal(inWindow('doors', t), false)
})

test('door 512 opens only in the last part of the corridor scene', () => {
  const [c0, c1] = WINDOWS.corridor
  const [o0, o1] = DOOR512.open
  assert.ok(o0 >= c0 + 0.5 * (c1 - c0), 'door opens before the second half of the corridor scene')
  assert.ok(o0 >= DOOR512.approach[1], 'door opens before the walk toward it ends')
  assert.ok(o1 < c1, 'door is still opening when the corridor scene ends')
  assert.ok(DOOR512.light[0] >= DOOR512.approach[0] + 1.5, 'door glow appears at the start of the corridor')
})

test('door 512 starts small and grows as the camera walks toward it', () => {
  const start = doorScreenHeight(0)
  const beforeOpening = doorScreenHeight(DOOR512.pushApproach)
  const through = doorScreenHeight(DOOR512.pushThrough)
  assert.ok(start < 0.3, `door fills ${(start * 100).toFixed(0)}% of the screen height at the start`)
  assert.ok(beforeOpening > 0.4 && beforeOpening < 0.6, `door fills ${(beforeOpening * 100).toFixed(0)}% when it opens`)
  assert.ok(through >= 1, 'camera does not go all the way through the doorway')
})

test('room 1 only appears once door 512 has opened', () => {
  assert.ok(WINDOWS.room1[0] >= DOOR512.open[1], 'room 1 shows before the door is open')
  assert.ok(WINDOWS.corridor[1] > WINDOWS.room1[0], 'gap between corridor and room 1')
})

test('scene windows follow the journey order', () => {
  const order = ['hero', 'doors', 'lobby', 'reception', 'key', 'corridor', 'room1', 'room2', 'room3', 'restaurant'] as const
  for (let i = 1; i < order.length; i++) {
    assert.ok(WINDOWS[order[i]][0] >= WINDOWS[order[i - 1]][0], `${order[i]} starts before ${order[i - 1]}`)
  }
})
