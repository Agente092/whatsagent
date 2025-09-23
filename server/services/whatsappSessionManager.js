// =================================
// Servicio de manejo de sesiones WhatsApp para producción
// =================================

const fs = require('fs')
const path = require('path')
const logger = require('./logger')

class WhatsAppSessionManager {
  constructor() {
    this.sessionDir = path.join(process.cwd(), 'auth_info_baileys')
    this.backupDir = path.join(process.cwd(), 'session_backup')
    this.initializeDirectories()
  }

  initializeDirectories() {
    try {
      // Crear directorio de sesiones si no existe
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true })
        logger.info('Created WhatsApp session directory', { service: 'whatsapp-session' })
      }

      // Crear directorio de backup si no existe
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true })
        logger.info('Created WhatsApp backup directory', { service: 'whatsapp-session' })
      }
    } catch (error) {
      logger.error('Error initializing session directories:', error)
    }
  }

  // Verificar si existe una sesión activa
  hasActiveSession() {
    try {
      const files = fs.readdirSync(this.sessionDir)
      const sessionFiles = files.filter(file => file.includes('session-') || file.includes('creds.json'))
      
      logger.info(`Found ${sessionFiles.length} session files`, { 
        service: 'whatsapp-session',
        files: sessionFiles.length 
      })
      
      return sessionFiles.length > 0
    } catch (error) {
      logger.error('Error checking active session:', error)
      return false
    }
  }

  // Limpiar sesión (para reconexión)
  clearSession() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        // Crear backup antes de limpiar
        this.createBackup()
        
        // Limpiar directorio
        const files = fs.readdirSync(this.sessionDir)
        files.forEach(file => {
          fs.unlinkSync(path.join(this.sessionDir, file))
        })
        
        logger.info('WhatsApp session cleared successfully', { service: 'whatsapp-session' })
        return true
      }
    } catch (error) {
      logger.error('Error clearing session:', error)
      return false
    }
  }

  // Crear backup de la sesión actual
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(this.backupDir, `session-backup-${timestamp}`)
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true })
      }

      const files = fs.readdirSync(this.sessionDir)
      files.forEach(file => {
        const srcPath = path.join(this.sessionDir, file)
        const destPath = path.join(backupPath, file)
        fs.copyFileSync(srcPath, destPath)
      })

      logger.info('Session backup created successfully', { 
        service: 'whatsapp-session',
        backupPath,
        filesCount: files.length
      })
      
      return backupPath
    } catch (error) {
      logger.error('Error creating session backup:', error)
      return null
    }
  }

  // Restaurar sesión desde backup
  restoreFromBackup(backupTimestamp) {
    try {
      const backupPath = path.join(this.backupDir, `session-backup-${backupTimestamp}`)
      
      if (!fs.existsSync(backupPath)) {
        logger.error('Backup not found', { service: 'whatsapp-session', backupPath })
        return false
      }

      // Limpiar sesión actual
      this.clearSession()

      // Restaurar archivos
      const files = fs.readdirSync(backupPath)
      files.forEach(file => {
        const srcPath = path.join(backupPath, file)
        const destPath = path.join(this.sessionDir, file)
        fs.copyFileSync(srcPath, destPath)
      })

      logger.info('Session restored from backup successfully', {
        service: 'whatsapp-session',
        backupPath,
        filesCount: files.length
      })
      
      return true
    } catch (error) {
      logger.error('Error restoring session from backup:', error)
      return false
    }
  }

  // Obtener información de la sesión
  getSessionInfo() {
    try {
      const sessionExists = this.hasActiveSession()
      const files = fs.readdirSync(this.sessionDir)
      
      return {
        exists: sessionExists,
        fileCount: files.length,
        files: files,
        directory: this.sessionDir,
        lastModified: this.getLastModified()
      }
    } catch (error) {
      logger.error('Error getting session info:', error)
      return {
        exists: false,
        fileCount: 0,
        files: [],
        directory: this.sessionDir,
        lastModified: null
      }
    }
  }

  // Obtener fecha de última modificación
  getLastModified() {
    try {
      const files = fs.readdirSync(this.sessionDir)
      let lastModified = null
      
      files.forEach(file => {
        const filePath = path.join(this.sessionDir, file)
        const stats = fs.statSync(filePath)
        
        if (!lastModified || stats.mtime > lastModified) {
          lastModified = stats.mtime
        }
      })
      
      return lastModified
    } catch (error) {
      return null
    }
  }

  // Limpiar backups antiguos (mantener solo los últimos 5)
  cleanOldBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) return

      const backups = fs.readdirSync(this.backupDir)
        .filter(dir => dir.startsWith('session-backup-'))
        .map(dir => ({
          name: dir,
          path: path.join(this.backupDir, dir),
          timestamp: fs.statSync(path.join(this.backupDir, dir)).mtime
        }))
        .sort((a, b) => b.timestamp - a.timestamp)

      // Mantener solo los últimos 5 backups
      if (backups.length > 5) {
        const toDelete = backups.slice(5)
        
        toDelete.forEach(backup => {
          fs.rmSync(backup.path, { recursive: true, force: true })
          logger.info('Old backup deleted', { 
            service: 'whatsapp-session',
            backup: backup.name 
          })
        })
      }
    } catch (error) {
      logger.error('Error cleaning old backups:', error)
    }
  }
}

module.exports = WhatsAppSessionManager