import { Router, json, error } from 'itty-router';

// Создаем роутер
const router = Router();

// ============ MIDDLEWARE ============
const withDB = (handler: Function) => {
  return async (request: Request, env: any, ctx: any) => {
    return handler(request, env, ctx);
  };
};

// ============ HELPERS ============
const generateId = () => {
  return crypto.randomUUID();
};

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

// ============ ОБРАБОТЧИКИ ============

// Корневой путь
router.get('/', () => {
  return jsonResponse({ 
    message: 'DevStore API', 
    version: '1.0.0',
    endpoints: {
      developers: '/api/developers',
      apps: '/api/apps',
      reviews: '/api/reviews',
      updates: '/api/updates'
    }
  });
});

// ============ РАЗРАБОТЧИКИ ============

// Получить всех разработчиков
router.get('/api/developers', withDB(async (request: Request, env: any) => {
  try {
    const result = await env.DB.prepare(
      'SELECT id, name, email, bio, avatar_url, is_verified, registered_at FROM developers ORDER BY registered_at DESC'
    ).all();
    
    return jsonResponse({ success: true, data: result.results });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Получить разработчика по ID
router.get('/api/developers/:id', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await env.DB.prepare(
      'SELECT id, name, email, bio, avatar_url, is_verified, registered_at FROM developers WHERE id = ?'
    ).bind(id).first();
    
    if (!result) {
      return jsonResponse({ success: false, error: 'Developer not found' }, 404);
    }
    
    return jsonResponse({ success: true, data: result });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Регистрация разработчика
router.post('/api/developers/register', withDB(async (request: Request, env: any) => {
  try {
    const body = await request.json() as any;
    const { name, email, password, bio = '', avatar_url = '' } = body;
    
    if (!name || !email || !password) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }
    
    // Проверяем email
    const existing = await env.DB.prepare(
      'SELECT id FROM developers WHERE email = ?'
    ).bind(email).first();
    
    if (existing) {
      return jsonResponse({ success: false, error: 'Email already registered' }, 400);
    }
    
    const id = generateId();
    const passwordHash = await hashPassword(password);
    
    await env.DB.prepare(
      `INSERT INTO developers (id, name, email, password_hash, bio, avatar_url) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, passwordHash, bio, avatar_url).run();
    
    return jsonResponse({ 
      success: true, 
      data: { id, name, email, bio, avatar_url }
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Вход разработчика
router.post('/api/developers/login', withDB(async (request: Request, env: any) => {
  try {
    const body = await request.json() as any;
    const { email, password } = body;
    
    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Missing email or password' }, 400);
    }
    
    const developer = await env.DB.prepare(
      'SELECT * FROM developers WHERE email = ?'
    ).bind(email).first();
    
    if (!developer) {
      return jsonResponse({ success: false, error: 'Invalid email or password' }, 401);
    }
    
    const passwordHash = await hashPassword(password);
    if (developer.password_hash !== passwordHash) {
      return jsonResponse({ success: false, error: 'Invalid email or password' }, 401);
    }
    
    // Обновляем время последнего входа
    await env.DB.prepare(
      'UPDATE developers SET last_login = ? WHERE id = ?'
    ).bind(Date.now(), developer.id).run();
    
    return jsonResponse({ 
      success: true, 
      data: {
        id: developer.id,
        name: developer.name,
        email: developer.email,
        bio: developer.bio,
        avatar_url: developer.avatar_url,
        is_verified: developer.is_verified
      }
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// ============ ПРИЛОЖЕНИЯ ============

// Получить все приложения
router.get('/api/apps', withDB(async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    let query = `
      SELECT a.*, d.name as developer_name 
      FROM apps a
      LEFT JOIN developers d ON a.developer_id = d.id
    `;
    const params: any[] = [];
    
    if (category && category !== 'Все') {
      query += ' WHERE a.category = ?';
      params.push(category);
    }
    
    if (search) {
      if (params.length > 0) query += ' AND (a.name LIKE ? OR a.description LIKE ?)';
      else query += ' WHERE a.name LIKE ? OR a.description LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY a.download_count DESC';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({ success: true, data: result.results });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Получить приложение по ID
router.get('/api/apps/:id', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await env.DB.prepare(
      `SELECT a.*, d.name as developer_name 
       FROM apps a 
       LEFT JOIN developers d ON a.developer_id = d.id 
       WHERE a.id = ?`
    ).bind(id).first();
    
    if (!result) {
      return jsonResponse({ success: false, error: 'App not found' }, 404);
    }
    
    return jsonResponse({ success: true, data: result });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Добавить приложение
router.post('/api/apps', withDB(async (request: Request, env: any) => {
  try {
    const body = await request.json() as any;
    const { 
      developer_id, name, package_name, description, version, 
      version_code, size, category, icon_url, apk_url, screenshots = []
    } = body;
    
    if (!developer_id || !name || !package_name || !version) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const id = generateId();
    const screenshotsJson = JSON.stringify(screenshots);
    
    await env.DB.prepare(
      `INSERT INTO apps (id, developer_id, name, package_name, description, version, version_code, size, category, icon_url, apk_url, screenshots) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, developer_id, name, package_name, description, version, version_code, size, category, icon_url, apk_url, screenshotsJson).run();
    
    // Добавляем запись в обновления
    await env.DB.prepare(
      `INSERT OR REPLACE INTO app_updates (app_id, version_code, version_name, apk_url, changelog) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, version_code, version, apk_url, description).run();
    
    return jsonResponse({ success: true, data: { id } });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Обновить приложение
router.put('/api/apps/:id', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    const body = await request.json() as any;
    const { name, package_name, description, version, version_code, size, category, icon_url, apk_url, screenshots } = body;
    
    const screenshotsJson = JSON.stringify(screenshots || []);
    
    await env.DB.prepare(
      `UPDATE apps SET 
        name = ?, package_name = ?, description = ?, version = ?, 
        version_code = ?, size = ?, category = ?, icon_url = ?, 
        apk_url = ?, screenshots = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      name, package_name, description, version, version_code, 
      size, category, icon_url, apk_url, screenshotsJson, Date.now(), id
    ).run();
    
    // Обновляем запись об обновлении
    await env.DB.prepare(
      `INSERT OR REPLACE INTO app_updates (app_id, version_code, version_name, apk_url, changelog) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, version_code, version, apk_url, description).run();
    
    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Удалить приложение
router.delete('/api/apps/:id', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    await env.DB.prepare('DELETE FROM apps WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM app_updates WHERE app_id = ?').bind(id).run();
    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// ============ ОТЗЫВЫ ============

// Получить отзывы для приложения
router.get('/api/apps/:id/reviews', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await env.DB.prepare(
      'SELECT * FROM reviews WHERE app_id = ? ORDER BY date DESC'
    ).bind(id).all();
    
    return jsonResponse({ success: true, data: result.results });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Добавить отзыв
router.post('/api/reviews', withDB(async (request: Request, env: any) => {
  try {
    const body = await request.json() as any;
    const { app_id, author_name, text, rating } = body;
    
    if (!app_id || !author_name || !text || !rating) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const id = generateId();
    await env.DB.prepare(
      `INSERT INTO reviews (id, app_id, author_name, text, rating) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, app_id, author_name, text, rating).run();
    
    // Пересчитываем средний рейтинг
    const avgResult = await env.DB.prepare(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE app_id = ?'
    ).bind(app_id).first();
    
    const avgRating = avgResult?.avg_rating || 0;
    await env.DB.prepare(
      'UPDATE apps SET rating = ? WHERE id = ?'
    ).bind(avgRating, app_id).run();
    
    return jsonResponse({ success: true, data: { id } });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// ============ ОБНОВЛЕНИЯ ============

// Проверить обновление приложения
router.get('/api/apps/:id/update', withDB(async (request: Request, env: any, ctx: any) => {
  try {
    const { id } = ctx.params;
    
    // Получаем текущую версию из app_updates
    let update = await env.DB.prepare(
      'SELECT * FROM app_updates WHERE app_id = ?'
    ).bind(id).first();
    
    if (!update) {
      // Если нет в кэше, получаем из apps
      const app = await env.DB.prepare(
        'SELECT id, version_code, version, apk_url FROM apps WHERE id = ?'
      ).bind(id).first();
      
      if (!app) {
        return jsonResponse({ success: false, error: 'App not found' }, 404);
      }
      
      // Добавляем в кэш
      await env.DB.prepare(
        `INSERT OR REPLACE INTO app_updates (app_id, version_code, version_name, apk_url, changelog) 
         VALUES (?, ?, ?, ?, ?)`
      ).bind(app.id, app.version_code, app.version, app.apk_url, '').run();
      
      return jsonResponse({ 
        success: true, 
        data: {
          app_id: app.id,
          version_code: app.version_code,
          version_name: app.version,
          apk_url: app.apk_url,
          changelog: ''
        }
      });
    }
    
    return jsonResponse({ success: true, data: update });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// Обновить информацию об обновлении
router.post('/api/updates', withDB(async (request: Request, env: any) => {
  try {
    const body = await request.json() as any;
    const { app_id, version_code, version_name, apk_url, changelog = '' } = body;
    
    if (!app_id || !version_code || !version_name || !apk_url) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }
    
    await env.DB.prepare(
      `INSERT OR REPLACE INTO app_updates (app_id, version_code, version_name, apk_url, changelog, last_checked) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(app_id, version_code, version_name, apk_url, changelog, Date.now()).run();
    
    // Обновляем версию в apps
    await env.DB.prepare(
      'UPDATE apps SET version = ?, version_code = ?, apk_url = ?, updated_at = ? WHERE id = ?'
    ).bind(version_name, version_code, apk_url, Date.now(), app_id).run();
    
    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// ============ СИНХРОНИЗАЦИЯ ============

// Получить все данные для синхронизации (офлайн-режим)
router.get('/api/sync', withDB(async (request: Request, env: any) => {
  try {
    const apps = await env.DB.prepare(
      `SELECT a.*, d.name as developer_name 
       FROM apps a 
       LEFT JOIN developers d ON a.developer_id = d.id`
    ).all();
    
    const developers = await env.DB.prepare(
      'SELECT id, name, email, bio, avatar_url, is_verified, registered_at FROM developers'
    ).all();
    
    const reviews = await env.DB.prepare(
      'SELECT * FROM reviews'
    ).all();
    
    const updates = await env.DB.prepare(
      'SELECT * FROM app_updates'
    ).all();
    
    return jsonResponse({ 
      success: true, 
      data: {
        apps: apps.results,
        developers: developers.results,
        reviews: reviews.results,
        updates: updates.results,
        sync_time: Date.now()
      }
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}));

// ============ ОБРАБОТКА CORS ============
router.options('*', () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
});

// ============ ОБРАБОТЧИК 404 ============
router.all('*', () => {
  return jsonResponse({ success: false, error: 'Not Found' }, 404);
});

// ============ ОСНОВНОЙ ОБРАБОТЧИК ============
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    return router.handle(request, env, ctx);
  }
};