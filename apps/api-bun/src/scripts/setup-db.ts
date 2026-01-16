
import { Client } from '@notionhq/client';

const apiKey = process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID;

if (!apiKey || !databaseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const client = new Client({ auth: apiKey });

async function setup() {
  console.log('🌱 Iniciando Setup de Notion DB:', databaseId);

  try {
    // 0. Inspeccionar DB actual
    console.log('🔍 Inspeccionando base de datos...');
    const db: any = await client.databases.retrieve({ database_id: databaseId! });

    // Obtener el nombre real de la propiedad 'title'
    let titlePropName = 'Name';
    const existingProps = Object.keys(db.properties);
    console.log('   Propiedades actuales:', existingProps);

    for (const [key, value] of Object.entries(db.properties)) {
      if ((value as any).type === 'title') {
        titlePropName = key;
        console.log(`   📝 Propiedad Title detectada como: "${titlePropName}"`);
        break;
      }
    }

    // 1. Actualizar esquema (añadir columnas que faltan)
    console.log('📦 Actualizando esquema...');
    const propertiesToUpdate: any = {};

    // Solo añadimos si no existen o forzamos actualización
    // Notion creará las que no existan
    if (!db.properties['Category']) propertiesToUpdate['Category'] = { select: {} };
    if (!db.properties['Tags']) propertiesToUpdate['Tags'] = { multi_select: {} };
    if (!db.properties['URL']) propertiesToUpdate['URL'] = { url: {} };
    if (!db.properties['Sentiment']) propertiesToUpdate['Sentiment'] = { select: {} };
    if (!db.properties['Date']) propertiesToUpdate['Date'] = { date: {} };
    if (!db.properties['Summary']) propertiesToUpdate['Summary'] = { rich_text: {} };

    if (Object.keys(propertiesToUpdate).length > 0) {
      await client.databases.update({
        database_id: databaseId!,
        properties: propertiesToUpdate
      });
      console.log('✅ Esquema actualizado con nuevas columnas:', Object.keys(propertiesToUpdate));
    } else {
      console.log('ℹ️ Esquema ya parece completo.');
    }

    // 2. Insertar datos
    const examples = [
      {
        title: 'Introducción a React Hooks',
        summary: 'Guía básica sobre useState y useEffect.',
        tags: ['React', 'Frontend'],
        sentiment: 'neutral',
        originalUrl: 'https://react.dev',
        keyPoints: ['useState permite estado local', 'useEffect maneja ciclo de vida'],
        category: 'Programación'
      },
      {
        title: 'Historia de la IA',
        summary: 'Resumen de los hitos más importantes de la IA.',
        tags: ['IA', 'Historia'],
        sentiment: 'positive',
        originalUrl: 'https://wikipedia.org/wiki/AI',
        keyPoints: ['Test de Turing', 'ChatGPT'],
        category: 'Inteligencia Artificial'
      }
    ];

    for (const ex of examples) {
      console.log(`📝 Creando página: ${ex.title}`);

      const props: any = {};

      // Usar el nombre dinámico para el título
      props[titlePropName] = { title: [{ text: { content: ex.title } }] };

      // El resto asumimos que existen porque acabamos de actualizarlas
      props['Category'] = { select: { name: ex.category } };
      props['Tags'] = { multi_select: ex.tags.map(t => ({ name: t })) };
      props['URL'] = { url: ex.originalUrl };
      props['Sentiment'] = { select: { name: ex.sentiment } };
      props['Date'] = { date: { start: new Date().toISOString() } };
      props['Summary'] = { rich_text: [{ text: { content: ex.summary } }] };

      await client.pages.create({
        parent: { database_id: databaseId! },
        icon: { type: 'emoji', emoji: '📚' },
        properties: props,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ text: { content: 'Resumen' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: ex.summary } }] }
          }
        ]
      });
    }

    console.log('✨ Setup completado con éxito!');

  } catch (error: any) {
    console.error('❌ Error en el setup:');
    if (error.body) {
      console.error(error.body);
    } else {
      console.error(error);
    }
  }
}

setup();
