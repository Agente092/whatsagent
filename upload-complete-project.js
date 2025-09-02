const fs = require('fs');
const path = require('path');

// GitHub API configuration - Leer token de variable de entorno (obligatorio)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN no está definido en las variables de entorno');
  console.error('Por favor, establece la variable de entorno GITHUB_TOKEN con tu token de GitHub');
  console.error('Ejemplo: GITHUB_TOKEN="ghp_TuTokenDeGitHubAqui" node upload-complete-project.js');
  process.exit(1);
}

const OWNER = 'Agente092';
const REPO = 'whatsagent';
const BRANCH = 'main';

class GitHubBulkUploader {
  constructor() {
    this.apiBase = 'https://api.github.com';
    this.headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Verificar token al inicio
    this.verifyToken();
  }
  
  // Verificar si el token tiene permisos correctos
  async verifyToken() {
    try {
      console.log('\ud83d\udd11 Verificando token de GitHub...');
      const response = await fetch(`${this.apiBase}/user`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        console.error('\u26a0\ufe0f Error: Token de GitHub no válido o sin permisos adecuados');
        console.error(`Status: ${response.status} ${response.statusText}`);
        const errorDetails = await response.text();
        console.error(`Detalles: ${errorDetails}`);
        console.log('\n\u26a0\ufe0f Por favor, genera un nuevo token con permisos "repo" en https://github.com/settings/tokens');
      } else {
        const data = await response.json();
        console.log(`\u2705 Token válido! Autenticado como: ${data.login}`);
      }
    } catch (error) {
      console.error('\u26a0\ufe0f Error verificando token:', error.message);
    }
  }

  // Leer .gitignore para exclusiones
  loadGitignore() {
    try {
      const gitignorePath = path.join(__dirname, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf8');
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (error) {
      console.log('No .gitignore found, uploading all files');
      return [];
    }
  }

  // Verificar si archivo debe ser excluido
  shouldExclude(filePath, excludePatterns) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // SIEMPRE excluir el directorio .git y sus contenidos
    if (normalizedPath.startsWith('.git/') || normalizedPath === '.git') {
      return true;
    }
    
    // SIEMPRE excluir el directorio de backup
    if (normalizedPath.startsWith('proyecto-empresas(backup)/') || normalizedPath === 'proyecto-empresas(backup)') {
      return true;
    }
    
    return excludePatterns.some(pattern => {
      // Patrones específicos del .gitignore
      if (pattern.includes('node_modules')) return normalizedPath.includes('node_modules');
      if (pattern.includes('.next')) return normalizedPath.includes('.next');
      if (pattern.includes('auth_info_baileys')) return normalizedPath.includes('auth_info_baileys');
      if (pattern.includes('logs/')) return normalizedPath.includes('logs/');
      if (pattern.includes('coverage/')) return normalizedPath.includes('coverage/');
      if (pattern.includes('.env')) return normalizedPath.includes('.env');
      if (pattern.includes('*.log')) return normalizedPath.endsWith('.log');
      if (pattern.includes('*.db')) return normalizedPath.endsWith('.db');
      if (pattern.includes('*.sqlite')) return normalizedPath.endsWith('.sqlite');
      
      // Patrón exacto
      return normalizedPath === pattern || normalizedPath.endsWith(pattern);
    });
  }

  // Obtener todos los archivos del proyecto
  getAllFiles(dir = __dirname, excludePatterns = []) {
    const files = [];
    const self = this; // Guardar referencia a this para usar en la función anidada
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const relativePath = path.relative(__dirname, fullPath);
        
        // Excluir explícitamente directorios .git
        if (item === '.git' || relativePath.includes('.git\\') || relativePath.includes('/.git/')) {
          console.log(`🚫 Saltando directorio Git: ${relativePath}`);
          continue;
        }
        
        // Excluir explícitamente el directorio de backup
        if (item === 'proyecto-empresas(backup)' || relativePath.startsWith('proyecto-empresas(backup)')) {
          console.log(`🚫 Saltando directorio de backup: ${relativePath}`);
          continue;
        }
        
        // Saltar si está excluido
        if (self.shouldExclude(relativePath, excludePatterns)) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          // Solo archivos de texto/código
          const ext = path.extname(item).toLowerCase();
          const textExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.css', '.html', '.yaml', '.yml', '.env.example', '.gitignore', '.prisma'];
          
          if (textExtensions.includes(ext) || item.includes('config') || !ext) {
            files.push({
              path: relativePath.replace(/\\/g, '/'),
              content: fs.readFileSync(fullPath, 'utf8')
            });
          }
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  // Crear blob para un archivo
  async createBlob(content) {
    try {
      const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/blobs`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error al crear blob: ${response.status} ${response.statusText}`);
        console.error(`Respuesta: ${errorText}`);
        throw new Error(`Failed to create blob: ${response.statusText} (${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error detallado al crear blob:', error.message);
      throw error;
    }
  }

  // Crear commit inicial si es necesario
  async createInitialCommit() {
    console.log('💻 Creando commit inicial para repositorio vacío...');
    
    // Crear un archivo README.md inicial
    const readmeContent = `# WhatsApp Business Advisor

Sistema automatizado de asesoría empresarial vía WhatsApp con inteligencia artificial.

## Características

- Panel de administración profesional
- Bot de WhatsApp inteligente
- Integración con IA avanzada
- Base de conocimientos especializada
`;
    
    // 1. Crear blob para el README
    const readmeBlob = await this.createBlob(readmeContent);
    
    // 2. Crear tree con el README
    const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/trees`;
    const treeResponse = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        tree: [{
          path: 'README.md',
          mode: '100644',
          type: 'blob',
          sha: readmeBlob.sha
        }]
      })
    });
    
    if (!treeResponse.ok) {
      throw new Error(`Failed to create initial tree: ${treeResponse.statusText}`);
    }
    
    const treeData = await treeResponse.json();
    
    // 3. Crear commit inicial
    const commitUrl = `${this.apiBase}/repos/${OWNER}/${REPO}/git/commits`;
    const commitResponse = await fetch(commitUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        message: '🚀 Inicialización del repositorio',
        tree: treeData.sha,
        parents: []
      })
    });
    
    if (!commitResponse.ok) {
      throw new Error(`Failed to create initial commit: ${commitResponse.statusText}`);
    }
    
    const commitData = await commitResponse.json();
    
    // 4. Crear o actualizar la referencia del branch
    try {
      const refUrl = `${this.apiBase}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
      const refResponse = await fetch(refUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ref: `refs/heads/${BRANCH}`,
          sha: commitData.sha
        })
      });
      
      if (!refResponse.ok) {
        // Si ya existe, actualizar
        const updateResponse = await fetch(refUrl, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            sha: commitData.sha,
            force: true
          })
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Failed to update branch reference: ${updateResponse.statusText}`);
        }
      }
    } catch (error) {
      console.log('⚠️ Error al crear referencia, intentando otro método...');
      
      // Método alternativo: crear directamente la referencia
      const altRefUrl = `${this.apiBase}/repos/${OWNER}/${REPO}/git/refs`;
      const altRefResponse = await fetch(altRefUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ref: `refs/heads/${BRANCH}`,
          sha: commitData.sha
        })
      });
      
      if (!altRefResponse.ok) {
        throw new Error(`Failed to create branch reference: ${altRefResponse.statusText}`);
      }
    }
    
    console.log('✅ Commit inicial creado con éxito');
    return commitData.sha;
  }

  // Obtener SHA del branch actual
  async getCurrentBranchSHA() {
    try {
      const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
      const response = await fetch(url, { headers: this.headers });
      
      if (!response.ok) {
        console.log('⚠️ Branch no encontrado, crearemos uno nuevo...');
        return null; // Retornar null indica que no existe el branch
      }
      
      const data = await response.json();
      return data.object.sha;
    } catch (error) {
      console.log('⚠️ No se pudo obtener información del branch, crearemos uno nuevo...');
      return null; // Retornar null si hay cualquier error
    }
  }

  // Obtener tree base
  async getBaseTree() {
    try {
      const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}`;
      const response = await fetch(url, { headers: this.headers });
      
      if (!response.ok) {
        console.log('⚠️ No se encontró un árbol base, creando repositorio desde cero...');
        return null; // Retornar null indica que no hay árbol base
      }
      
      const data = await response.json();
      return data.sha;
    } catch (error) {
      console.log('⚠️ El repositorio parece estar vacío, creando desde cero...');
      return null; // Retornar null si hay cualquier error
    }
  }

  // Crear tree con todos los archivos
  async createTree(files, baseTreeSHA) {
    console.log(`📦 Creating tree with ${files.length} files...`);
    
    // Crear blobs para todos los archivos
    const tree = [];
    let completed = 0;
    
    for (const file of files) {
      try {
        console.log(`📄 Processing ${file.path} (${++completed}/${files.length})`);
        const blob = await this.createBlob(file.content);
        
        tree.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        });
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error processing ${file.path}:`, error.message);
      }
    }
    
    // Crear el tree
    const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/trees`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        tree,
        base_tree: baseTreeSHA
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create tree: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Crear commit
  async createCommit(treeSHA, parentSHA, message) {
    const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/commits`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        message,
        tree: treeSHA,
        parents: [parentSHA]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create commit: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Actualizar referencia del branch
  async updateRef(commitSHA) {
    const url = `${this.apiBase}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        sha: commitSHA
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update ref: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Método principal: subir todo el proyecto
  async uploadCompleteProject() {
    try {
      console.log('🚀 Starting complete project upload...');
      
      // 1. Cargar exclusiones del .gitignore
      const excludePatterns = this.loadGitignore();
      console.log(`📋 Loaded ${excludePatterns.length} exclusion patterns from .gitignore`);
      
      // 2. Obtener todos los archivos
      const files = this.getAllFiles(__dirname, excludePatterns);
      console.log(`📁 Found ${files.length} files to upload`);
      
      if (files.length === 0) {
        console.log('❌ No files found to upload');
        return;
      }
      
      // 3. Obtener información del repositorio
      console.log('🔍 Getting repository information...');
      let currentSHA = await this.getCurrentBranchSHA();
      let baseTreeSHA = await this.getBaseTree();
      
      // Si el repositorio está vacío, crear un commit inicial
      if (currentSHA === null || baseTreeSHA === null) {
        console.log('🏗️ Repositorio vacío detectado, iniciando con commit inicial...');
        currentSHA = await this.createInitialCommit();
        baseTreeSHA = null; // No hay árbol base, se creará desde cero
      }
      
      // 4. Crear tree con todos los archivos
      const tree = await this.createTree(files, baseTreeSHA);
      
      // 5. Crear commit
      console.log('💫 Creating commit...');
      const commit = await this.createCommit(
        tree.sha,
        currentSHA,
        `🚀 Complete project upload - ${files.length} files\n\nIncludes:\n- Frontend (Next.js)\n- Backend (Node.js/Express)\n- Components & UI\n- Configuration files\n- Documentation\n\nReady for deployment on Render.com`
      );
      
      // 6. Actualizar referencia
      console.log('🔄 Updating branch reference...');
      await this.updateRef(commit.sha);
      
      console.log('✅ SUCCESS! Complete project uploaded successfully!');
      console.log(`📊 Uploaded ${files.length} files in a single commit`);
      console.log(`🔗 Commit URL: https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);
      
      return {
        success: true,
        filesUploaded: files.length,
        commitSHA: commit.sha,
        commitURL: `https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`
      };
      
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Método alternativo para subir archivos directamente
  async uploadSimpleProject() {
    try {
      console.log('🚀 Iniciando carga directa del proyecto...');
      
      // 1. Cargar exclusiones del .gitignore
      const excludePatterns = this.loadGitignore();
      console.log(`📋 Cargados ${excludePatterns.length} patrones de exclusión del .gitignore`);
      
      // 2. Obtener todos los archivos
      const files = this.getAllFiles(__dirname, excludePatterns);
      console.log(`💾 Encontrados ${files.length} archivos para subir`);
      
      if (files.length === 0) {
        console.log('❌ No se encontraron archivos para subir');
        return {
          success: false,
          error: 'No files found'
        };
      }
      
      // 3. Subir README primero para inicializar el repositorio
      console.log('📝 Creando README.md inicial...');
      
      const readmeContent = `# WhatsApp Business Advisor

Sistema automatizado de asesoría empresarial vía WhatsApp con inteligencia artificial.

## Características

- Panel de administración profesional
- Bot de WhatsApp inteligente
- Integración con IA avanzada
- Base de conocimientos especializada
`;
      
      try {
        // Crear README primero
        await this.createOrUpdateFile('README.md', readmeContent, 'Inicialización del repositorio');
        console.log('✅ README.md creado correctamente');
      } catch (error) {
        console.log('⚠️ Error al crear README.md, puede que ya exista, continuando con la carga...');
      }
      
      // 4. Ordenar archivos por importancia/tamaño para evitar errores de timeout
      // Primero subir archivos más pequeños/fundamentales
      const orderedFiles = [...files].sort((a, b) => {
        // Primero archivos de configuración
        if (a.path.includes('config') && !b.path.includes('config')) return -1;
        if (!a.path.includes('config') && b.path.includes('config')) return 1;
        
        // Luego por tamaño (menor primero)
        return a.content.length - b.content.length;
      });
      
      // Verificar archivos y filtrar directorios .git
      const validFiles = orderedFiles.filter(file => !file.path.startsWith('.git/') && file.path !== '.git');
      console.log(`💾 Procesando ${validFiles.length} archivos válidos (excluyendo archivos .git)...`);
      
      // 5. Subir archivos en modo secuencial para evitar conflictos
      console.log(`🔄 Subiendo ${validFiles.length} archivos restantes en modo secuencial...`);
      let completed = 0;
      let successful = 0;
      let failures = 0;
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        try {
          console.log(`📝 Procesando ${file.path} (${++completed}/${validFiles.length})`);
          
          // Intentar hasta 3 veces en caso de error
          let attempts = 0;
          let success = false;
          
          while (attempts < 3 && !success) {
            try {
              await this.createOrUpdateFile(file.path, file.content);
              success = true;
              successful++;
            } catch (error) {
              attempts++;
              if (attempts < 3) {
                console.log(`⚠️ Reintentando ${file.path} (intento ${attempts+1}/3)...`);
                // Esperar un poco antes de reintentar
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                throw error; // Propagar el error si fallamos 3 veces
              }
            }
          }
          
        } catch (error) {
          console.error(`❌ Error procesando ${file.path}:`, error.message);
          failures++;
          // Continuar con el siguiente archivo aunque haya error
        }
        
        // Pequeña pausa entre archivos para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`\n✅ CARGA COMPLETADA!`);
      console.log(`📊 Archivos subidos con éxito: ${successful}`);
      console.log(`❌ Archivos con error: ${failures}`);
      
      return {
        success: true,
        filesUploaded: successful,
        filesFailed: failures
      };
      
    } catch (error) {
      console.error('❌ Error de carga:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Crear o actualizar archivo directamente
  async createOrUpdateFile(filePath, content, message = null) {
    try {
      const url = `${this.apiBase}/repos/${OWNER}/${REPO}/contents/${filePath}`;
      const commitMessage = message || `Agregar ${filePath}`;
      
      // Configuración básica del cuerpo
      const body = {
        message: commitMessage,
        content: Buffer.from(content).toString('base64')
      };
      
      // Intentar obtener el SHA del archivo actual si existe
      try {
        const getResponse = await fetch(url, {
          headers: this.headers
        });
        
        if (getResponse.ok) {
          const fileData = await getResponse.json();
          body.sha = fileData.sha;
        }
      } catch (error) {
        // El archivo no existe, se creará nuevo - no necesitamos sha
        console.log(`📝 Creando nuevo archivo: ${filePath}`);
      }
      
      // Modo forzado - no verificar SHA
      body.committer = {
        name: "GitHub API",
        email: "noreply@github.com"
      };
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${body.sha ? 'update' : 'create'} file: ${response.statusText} (${response.status}) - ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Error en archivo ${filePath}:`, error.message);
      throw error;
    }
  }

}

// Ejecutar si se llama directamente
if (require.main === module) {
  console.log('🔧 Iniciando carga del proyecto al repositorio GitHub...');
  console.log('⚠️ Asegurando que los archivos del directorio .git serán excluidos...');
  
  const uploader = new GitHubBulkUploader();
  
  // Usar el método alternativo más simple
  uploader.uploadSimpleProject()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 ¡CARGA DEL PROYECTO COMPLETADA CON ÉXITO!');
        console.log(`📊 Archivos subidos: ${result.filesUploaded}`);
        console.log(`🔗 Visita tu repositorio: https://github.com/${OWNER}/${REPO}`);
      } else {
        console.log('\n❌ Carga fallida:', result.error);
        if (result.error && result.error.includes('path contains a malformed path component')) {
          console.log('⚠️ Posible causa: Intentando subir archivos del directorio .git');
          console.log('   Solución: Ejecuta de nuevo el script con las correcciones realizadas');
        }
      }
    })
    .catch(error => {
      console.error('💥 Error inesperado:', error);
      if (error.message && error.message.includes('.git')) {
        console.log('⚠️ Se detectó un problema con archivos .git. El script ha sido corregido.');
        console.log('   Ejecuta de nuevo el script para intentar la carga sin archivos .git.');
      }
    });
}

module.exports = GitHubBulkUploader;