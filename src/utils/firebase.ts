import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { SequenceLength, ReductionStep } from '../types';
import { generateSequence, calculateReductionSteps } from './math';
import {
  getOrCreateDeviceId,
  getDeviceSummary,
  markDeviceLicenseRegistered,
} from './device';

const firebaseConfig = {
  apiKey: "AIzaSyD7dTPaXqqCwouVsexJscnEYjvAUZIJ97c",
  authDomain: "reduccionflash.firebaseapp.com",
  projectId: "reduccionflash",
  storageBucket: "reduccionflash.firebasestorage.app",
  messagingSenderId: "581854393622",
  appId: "1:581854393622:web:941fc3d98639db84fc0c37"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// -------------------------------------------------------------
// 100% FIRESTORE-BASED AUTH & SESSION MANAGEMENT (ESTILO METHAPLAN)
// -------------------------------------------------------------

export interface User {
  uid: string; // Correo del docente utilizado como ID único (ej. "docente@escuela.com")
  email: string;
  displayName: string;
  role?: string;
  licenseCode?: string;
  licenseActive?: boolean;
  activo?: boolean;
  deviceId?: string;
  dispositivoId?: string;
  createdAt?: number;
  fechaCanje?: number;
}

const SESSION_STORAGE_KEY = 'reduccion_current_user_session';
const authListeners = new Set<(user: User | null) => void>();

export function getStoredTeacherSession(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error al leer la sesión local del docente:', err);
  }
  return null;
}

export function saveTeacherSession(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Error al guardar la sesión local del docente:', err);
  }
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (e) {
      console.error('Error en listener de sesión:', e);
    }
  });
}

export function clearTeacherSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('Error al limpiar la sesión local del docente:', err);
  }
  authListeners.forEach((listener) => {
    try {
      listener(null);
    } catch (e) {
      console.error('Error en listener al cerrar sesión:', e);
    }
  });
}

/**
 * Custom auth object compatible with the rest of the application
 */
export const auth = {
  get currentUser(): User | null {
    return getStoredTeacherSession();
  },
};

/**
 * Auth state listener for component lifecycle updates
 */
export function onAuthStateChanged(
  _authInstance: any,
  callback: (user: User | null) => void
): () => void {
  authListeners.add(callback);
  // Llamada inmediata con la sesión activa actual
  callback(getStoredTeacherSession());
  return () => {
    authListeners.delete(callback);
  };
}

export async function signOut(_authInstance?: any): Promise<void> {
  clearTeacherSession();
}

export type RoomStatus =
  | 'waiting'
  | 'countdown'
  | 'showing_sequence'
  | 'answering'
  | 'round_result'
  | 'game_over';

export interface RoomSettings {
  mode: 'beginner' | 'advanced';
  sequenceLength: SequenceLength;
  stepIntervalSeconds: number;
  answeringTimeSeconds: number;
  totalRounds: number;
}

export interface RoomData {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  settings: RoomSettings;
  currentRound: number;
  sequence: number[];
  steps: ReductionStep[];
  correctAnswer: number;
  sequenceStartTime: number;
  answeringStartTime: number;
  createdAt: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  streak: number;
  lastAnswer: number | null;
  lastAnswerTimeMs: number | null;
  isCorrect: boolean | null;
  pointsAwarded: number;
  joinedAt: number;
}

function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export function generateRoomPin(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

export async function createRoom(
  hostId: string,
  hostName: string,
  settings: RoomSettings
): Promise<string> {
  const pin = generateRoomPin();
  const roomRef = doc(db, 'rooms', pin);
  const initialSequence = generateSequence(settings.sequenceLength);
  const calculation = calculateReductionSteps(initialSequence);

  const roomData: RoomData = {
    id: pin,
    code: pin,
    hostId,
    hostName: hostName || 'Profesor',
    status: 'waiting',
    settings,
    currentRound: 1,
    sequence: initialSequence,
    steps: calculation.steps,
    correctAnswer: calculation.finalReduced,
    sequenceStartTime: 0,
    answeringStartTime: 0,
    createdAt: Date.now(),
  };

  await setDoc(roomRef, sanitizeFirestoreData(roomData));
  return pin;
}

export async function getRoomByPin(pin: string): Promise<RoomData | null> {
  const cleanPin = pin.trim().toUpperCase();
  if (!cleanPin) return null;
  const roomRef = doc(db, 'rooms', cleanPin);
  const docSnap = await getDoc(roomRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as RoomData;
    if (data.code === cleanPin || docSnap.id === cleanPin) {
      return { ...data, id: docSnap.id, code: cleanPin };
    }
  }
  return null;
}

export async function joinRoom(
  pin: string,
  playerId: string,
  playerName: string
): Promise<boolean> {
  const cleanPin = pin.trim().toUpperCase();
  const room = await getRoomByPin(cleanPin);
  if (!room) return false;
  const playerRef = doc(db, 'rooms', cleanPin, 'players', playerId);
  const existingPlayer = await getDoc(playerRef);
  if (!existingPlayer.exists()) {
    const newPlayer: RoomPlayer = {
      id: playerId,
      name: playerName.trim() || `Alumno-${playerId.slice(0, 4)}`,
      score: 0,
      streak: 0,
      lastAnswer: null,
      lastAnswerTimeMs: null,
      isCorrect: null,
      pointsAwarded: 0,
      joinedAt: Date.now(),
    };
    await setDoc(playerRef, sanitizeFirestoreData(newPlayer));
  }
  return true;
}

export function subscribeToRoom(pin: string, onUpdate: (room: RoomData | null) => void) {
  const cleanPin = pin.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanPin);
  return onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ ...(docSnap.data() as RoomData), id: docSnap.id });
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error('Error listening to room:', error);
    onUpdate(null);
  });
}

export function subscribeToPlayers(pin: string, onUpdate: (players: RoomPlayer[]) => void) {
  const cleanPin = pin.trim().toUpperCase();
  const playersRef = collection(db, 'rooms', cleanPin, 'players');
  return onSnapshot(playersRef, (snapshot) => {
    const players: RoomPlayer[] = [];
    snapshot.forEach((docSnap) => {
      players.push(docSnap.data() as RoomPlayer);
    });
    players.sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
    onUpdate(players);
  }, (error) => {
    console.error('Error listening to players:', error);
    onUpdate([]);
  });
}

export async function updateRoomStatus(pin: string, status: RoomStatus, extraUpdates: Partial<RoomData> = {}) {
  const cleanPin = pin.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanPin);
  await updateDoc(roomRef, sanitizeFirestoreData({ status, ...extraUpdates }));
}

export async function startNewRoundInRoom(pin: string, roundNumber: number, sequenceLength: SequenceLength) {
  const cleanPin = pin.trim().toUpperCase();
  const newSequence = generateSequence(sequenceLength);
  const calculation = calculateReductionSteps(newSequence);
  const roomRef = doc(db, 'rooms', cleanPin);
  await updateDoc(roomRef, sanitizeFirestoreData({
    status: 'countdown',
    currentRound: roundNumber,
    sequence: newSequence,
    steps: calculation.steps,
    correctAnswer: calculation.finalReduced,
    sequenceStartTime: Date.now() + 3000,
    answeringStartTime: 0,
  }));
}

export async function submitPlayerAnswer(pin: string, playerId: string, answer: number, timeToAnswerMs: number, correctAnswer: number) {
  const cleanPin = pin.trim().toUpperCase();
  const isCorrect = answer === correctAnswer;
  const playerRef = doc(db, 'rooms', cleanPin, 'players', playerId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) return;
  const player = playerSnap.data() as RoomPlayer;
  let points = 0;
  let newStreak = player.streak;
  if (isCorrect) {
    newStreak += 1;
    const speedBonus = Math.max(0, Math.floor(500 - (timeToAnswerMs / 1000) * 50));
    const streakBonus = Math.min(500, newStreak * 100);
    points = 1000 + speedBonus + streakBonus;
  } else {
    newStreak = 0;
    points = 0;
  }
  await updateDoc(playerRef, sanitizeFirestoreData({
    lastAnswer: answer,
    lastAnswerTimeMs: timeToAnswerMs,
    isCorrect,
    score: player.score + points,
    pointsAwarded: points,
    streak: newStreak,
  }));
}

export async function resetPlayersRoundState(pin: string, playerIds: string[]) {
  const cleanPin = pin.trim().toUpperCase();
  for (const pid of playerIds) {
    const playerRef = doc(db, 'rooms', cleanPin, 'players', pid);
    await updateDoc(playerRef, {
      lastAnswer: null,
      lastAnswerTimeMs: null,
      isCorrect: null,
      pointsAwarded: 0,
    });
  }
}

// -------------------------------------------------------------
// LICENSE VALIDATION & TEACHER LINKING IN FIRESTORE
// -------------------------------------------------------------

export interface LicenseValidationResult {
  valid: boolean;
  message?: string;
  code: string;
  alreadyBoundToThisDevice?: boolean;
  isBoundToAnotherDevice?: boolean;
  licenseData?: Record<string, any>;
}

export async function validateLicenseInFirestore(rawCode: string): Promise<LicenseValidationResult> {
  const cleanCode = rawCode.trim();
  if (!cleanCode) {
    return {
      valid: false,
      code: '',
      message: 'Por favor, introduce un código de venta o activación.',
    };
  }

  // 1. Convert automatically to uppercase (.toUpperCase()) before searching
  const codeUpper = cleanCode.toUpperCase();
  const currentDeviceId = getOrCreateDeviceId();

  try {
    // 2. Search exact document strictly within the 'suscripciones' collection in Firestore
    let targetDocRef = doc(db, 'suscripciones', codeUpper);
    let docSnap = await getDoc(targetDocRef);
    let foundDocId = codeUpper;

    // In case the document in 'suscripciones' was keyed in lowercase (e.g. fla-0001)
    if (!docSnap.exists() && codeUpper !== cleanCode.toLowerCase()) {
      const lowerDocRef = doc(db, 'suscripciones', cleanCode.toLowerCase());
      const lowerSnap = await getDoc(lowerDocRef);
      if (lowerSnap.exists()) {
        docSnap = lowerSnap;
        targetDocRef = lowerDocRef;
        foundDocId = cleanCode.toLowerCase();
      }
    }

    if (docSnap.exists()) {
      const data = docSnap.data() as Record<string, any>;

      // 3. CANDADO DE DISPOSITIVO (Hardware Binding Check)
      // Read bound device from document (deviceId or dispositivoId)
      const boundDeviceId = data.deviceId || data.dispositivoId;

      if (boundDeviceId && boundDeviceId !== currentDeviceId) {
        return {
          valid: false,
          code: codeUpper,
          isBoundToAnotherDevice: true,
          message: 'Esta licencia ya se encuentra vinculada a otro equipo o dispositivo. Cada código de compra es de uso exclusivo para una sola computadora.',
        };
      }

      // 4. Read 'usada' / 'usado' and 'activo' fields properly
      const isUsado = data.usada === true ||
                      data.usada === 'true' ||
                      data.usado === true ||
                      data.usado === 'true' ||
                      data.status === 'redeemed' ||
                      data.isRedeemed === true ||
                      Boolean(data.usadoPorEmail) ||
                      Boolean(data.redeemedBy) ||
                      Boolean(data.usadoPor);

      if (isUsado) {
        // If it was already used but bound to this exact computer, allow logging in directly
        if (boundDeviceId && boundDeviceId === currentDeviceId) {
          markDeviceLicenseRegistered(foundDocId);
          return {
            valid: true,
            code: foundDocId,
            alreadyBoundToThisDevice: true,
            message: 'Este equipo ya cuenta con esta licencia validada y vinculada. Inicia sesión con tu cuenta docente.',
            licenseData: {
              ...data,
              _docId: foundDocId,
            },
          };
        }

        return {
          valid: false,
          code: codeUpper,
          isBoundToAnotherDevice: true,
          message: 'Este código de compra ya fue utilizado y está vinculado a otro equipo. Inicia sesión en tu computadora autorizada con tu correo y contraseña.',
        };
      }

      // 5. 'activo' can be boolean true/false or string 'true'/'false' or status === 'inactive'
      const isActivo = data.activo !== false &&
                       data.activo !== 'false' &&
                       data.status !== 'inactive';

      if (!isActivo) {
        return {
          valid: false,
          code: codeUpper,
          message: 'Este código de compra no se encuentra activo o ha sido revocado (activo: false).',
        };
      }

      return {
        valid: true,
        code: foundDocId,
        licenseData: {
          ...data,
          _docId: foundDocId,
        },
      };
    }

    // Special validation for authorized master/official purchase code Altair16
    if (codeUpper === 'ALTAIR16') {
      try {
        await setDoc(doc(db, 'suscripciones', 'ALTAIR16'), {
          codigo: 'ALTAIR16',
          activo: true,
          usada: false,
          usado: false,
          tipo: 'licencia_profesor_pro',
          descripcion: 'Licencia oficial de compra Reducción Flash',
          creadoEl: Date.now(),
        }, { merge: true });
      } catch (seedErr) {
        console.warn('Could not auto-seed ALTAIR16 subscription, continuing with client verification:', seedErr);
      }
      return {
        valid: true,
        code: 'ALTAIR16',
        licenseData: { codigo: 'ALTAIR16', activo: true, usada: false, usado: false, _docId: 'ALTAIR16' },
      };
    }

    return {
      valid: false,
      code: codeUpper,
      message: `El código "${codeUpper}" no fue encontrado en la colección "suscripciones" de Firestore. Verifica que esté bien escrito (ej. FLA-0001).`,
    };
  } catch (error: any) {
    console.error('Error validating license in Firestore collection "suscripciones":', error);
    // Offline / fallback for ALTAIR16
    if (codeUpper === 'ALTAIR16') {
      return {
        valid: true,
        code: 'ALTAIR16',
      };
    }
    return {
      valid: false,
      code: codeUpper,
      message: 'Error al conectar con Firestore para validar el código. Revisa tu conexión a internet.',
    };
  }
}

// -------------------------------------------------------------
// FIRESTORE TEACHER REGISTRATION & LOGIN (100% FIRESTORE - ESTILO METHAPLAN)
// -------------------------------------------------------------

/**
 * Registers a teacher account directly in Firestore 'usuarios' collection using the email as document ID
 * and marks the license in 'suscripciones' with usada: true, usadoPorEmail, fechaCanje.
 */
export async function registerTeacherWithFirestore(
  rawEmail: string,
  rawPassword: string,
  licenseCode: string,
  displayName?: string
): Promise<User> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanPassword = rawPassword.trim();
  const codeNormalized = licenseCode.trim().toUpperCase();

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Por favor, introduce un correo electrónico válido (ej. docente@escuela.com).');
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('La contraseña debe tener un mínimo de 6 caracteres.');
  }

  // Check if this teacher email is already registered in 'usuarios'
  const userDocRef = doc(db, 'usuarios', cleanEmail);
  const existingUserSnap = await getDoc(userDocRef);
  if (existingUserSnap.exists()) {
    throw new Error('Ya existe una cuenta docente registrada con este correo electrónico. Por favor, inicia sesión directamente.');
  }

  const now = Date.now();
  const currentDeviceId = getOrCreateDeviceId();
  const deviceSummary = getDeviceSummary();
  const name = displayName?.trim() || cleanEmail.split('@')[0];

  // 1. Save Teacher Profile in 'usuarios' using email directly as Document ID
  await setDoc(userDocRef, {
    uid: cleanEmail,
    email: cleanEmail,
    password: cleanPassword,
    displayName: name,
    role: 'teacher',
    licenseCode: codeNormalized,
    licenseActive: true,
    activo: true,
    deviceId: currentDeviceId,
    dispositivoId: currentDeviceId,
    deviceSummary,
    fechaRegistro: now,
    fechaCanje: now,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Update the specific activation code in 'suscripciones'
  // Marking: usada: true, usadoPorEmail: [email], fechaCanje: [timestamp]
  try {
    await setDoc(doc(db, 'suscripciones', codeNormalized), {
      codigo: codeNormalized,
      usada: true,
      usadoPorEmail: cleanEmail,
      fechaCanje: now,
      usado: true,
      activo: true,
      usadoPor: cleanEmail,
      emailProfesor: cleanEmail,
      deviceId: currentDeviceId,
      dispositivoId: currentDeviceId,
      deviceSummary,
      updatedAt: now,
    }, { merge: true });
  } catch (err) {
    console.error('Error actualizando documento en suscripciones:', err);
  }

  // 3. Register device flag in localStorage
  markDeviceLicenseRegistered(codeNormalized);

  const teacherUser: User = {
    uid: cleanEmail,
    email: cleanEmail,
    displayName: name,
    role: 'teacher',
    licenseCode: codeNormalized,
    licenseActive: true,
    activo: true,
    deviceId: currentDeviceId,
    dispositivoId: currentDeviceId,
    createdAt: now,
    fechaCanje: now,
  };

  // 4. Save session and notify listeners
  saveTeacherSession(teacherUser);

  return teacherUser;
}

/**
 * Logs in a teacher directly against Firestore 'usuarios' collection (without Firebase Auth)
 * validating the stored password and computer/device lock.
 */
export async function loginTeacherWithFirestore(
  rawEmail: string,
  rawPassword: string
): Promise<User> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanPassword = rawPassword.trim();

  if (!cleanEmail) {
    throw new Error('Por favor, ingresa tu correo electrónico.');
  }
  if (!cleanPassword) {
    throw new Error('Por favor, ingresa tu contraseña.');
  }

  // Consult directly the 'usuarios' collection using email as the document ID
  const userDocRef = doc(db, 'usuarios', cleanEmail);
  let userSnap = await getDoc(userDocRef);

  // Fallback check in case the email was stored with original casing
  if (!userSnap.exists() && rawEmail.trim() !== cleanEmail) {
    const rawRef = doc(db, 'usuarios', rawEmail.trim());
    const rawSnap = await getDoc(rawRef);
    if (rawSnap.exists()) {
      userSnap = rawSnap;
    }
  }

  if (!userSnap.exists()) {
    throw new Error(
      `No se encontró ningún docente registrado con el correo "${cleanEmail}". Si adquiriste una licencia, canjea tu código en la pestaña "Canjear Código".`
    );
  }

  const userData = userSnap.data() as Record<string, any>;

  // Validate stored password
  if (!userData.password || userData.password !== cleanPassword) {
    throw new Error('Contraseña incorrecta. Por favor verifica tus credenciales.');
  }

  // Validate hardware binding / candado de dispositivo
  const currentDeviceId = getOrCreateDeviceId();
  const boundDeviceId = userData.deviceId || userData.dispositivoId;
  if (boundDeviceId && boundDeviceId !== currentDeviceId) {
    throw new Error(
      'Esta cuenta docente está vinculada a otra computadora autorizada. Cada licencia es de uso exclusivo para un solo equipo.'
    );
  }

  // Validate active status
  if (userData.activo === false || userData.licenseActive === false) {
    throw new Error('La suscripción o licencia asociada a esta cuenta se encuentra inactiva o ha sido revocada.');
  }

  const teacherUser: User = {
    uid: cleanEmail,
    email: cleanEmail,
    displayName: userData.displayName || cleanEmail.split('@')[0],
    role: userData.role || 'teacher',
    licenseCode: userData.licenseCode || '',
    licenseActive: true,
    activo: true,
    deviceId: currentDeviceId,
    dispositivoId: currentDeviceId,
    createdAt: userData.createdAt || userData.fechaRegistro,
    fechaCanje: userData.fechaCanje,
  };

  // Register device license locally
  markDeviceLicenseRegistered(teacherUser.licenseCode);

  // Save session in local storage and notify auth listeners
  saveTeacherSession(teacherUser);

  return teacherUser;
}

/**
 * Legacy compatibility alias for linkLicenseToTeacherAccount
 */
export async function linkLicenseToTeacherAccount(
  userId: string,
  email: string,
  licenseCode: string,
  displayName?: string
): Promise<void> {
  await registerTeacherWithFirestore(email || userId, '123456', licenseCode, displayName);
}

/**
 * Checks if the teacher's account license is bound to the current computer or device.
 */
export async function checkTeacherDeviceAccess(emailOrId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const cleanId = emailOrId.trim().toLowerCase();
    const currentDeviceId = getOrCreateDeviceId();
    const userDoc = await getDoc(doc(db, 'usuarios', cleanId));
    if (!userDoc.exists()) {
      return { allowed: true };
    }

    const userData = userDoc.data();
    const boundDeviceId = userData.deviceId || userData.dispositivoId;

    if (boundDeviceId && boundDeviceId !== currentDeviceId) {
      return {
        allowed: false,
        message: 'Esta cuenta docente está vinculada a otra computadora autorizada. Cada licencia es de uso exclusivo para un solo equipo.',
      };
    }

    if (userData.licenseCode) {
      markDeviceLicenseRegistered(userData.licenseCode);
    }
    return { allowed: true };
  } catch (err) {
    console.error('Error checking teacher device access:', err);
    return { allowed: true };
  }
}

export async function getTeacherProfile(emailOrId: string): Promise<Record<string, any> | null> {
  try {
    const cleanId = emailOrId.trim().toLowerCase();
    const userDoc = await getDoc(doc(db, 'usuarios', cleanId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (err) {
    console.error('Error reading teacher profile from Firestore:', err);
    return null;
  }
}
