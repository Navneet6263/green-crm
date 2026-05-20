/**
 * Notes API Test Suite
 * 
 * Run with: node backend/tests/notes.test.js
 * 
 * Prerequisites:
 * - Backend server running
 * - Valid JWT token
 * - Database migration completed
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

let createdNoteId = null;

async function testCreateNote() {
  console.log('\n📝 Testing: Create Note');
  try {
    const response = await api.post('/notes', {
      title: 'Test Note',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is a test note' }]
          }
        ]
      }),
      color: 'blue',
      tags: ['test', 'automated']
    });

    createdNoteId = response.data.data.id;
    console.log('✅ Note created successfully');
    console.log('   ID:', createdNoteId);
    console.log('   Title:', response.data.data.title);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testListNotes() {
  console.log('\n📋 Testing: List Notes');
  try {
    const response = await api.get('/notes');
    console.log('✅ Notes retrieved successfully');
    console.log('   Count:', response.data.data.length);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSearchNotes() {
  console.log('\n🔍 Testing: Search Notes');
  try {
    const response = await api.get('/notes?search=test');
    console.log('✅ Search completed successfully');
    console.log('   Results:', response.data.data.length);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFilterByTag() {
  console.log('\n🏷️  Testing: Filter by Tag');
  try {
    const response = await api.get('/notes?tag=test');
    console.log('✅ Filter completed successfully');
    console.log('   Results:', response.data.data.length);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetNote() {
  console.log('\n📄 Testing: Get Single Note');
  if (!createdNoteId) {
    console.log('⚠️  Skipped: No note ID available');
    return false;
  }

  try {
    const response = await api.get(`/notes/${createdNoteId}`);
    console.log('✅ Note retrieved successfully');
    console.log('   Title:', response.data.data.title);
    console.log('   Tags:', response.data.data.tags);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateNote() {
  console.log('\n✏️  Testing: Update Note');
  if (!createdNoteId) {
    console.log('⚠️  Skipped: No note ID available');
    return false;
  }

  try {
    const response = await api.put(`/notes/${createdNoteId}`, {
      title: 'Updated Test Note',
      color: 'green',
      tags: ['test', 'updated']
    });
    console.log('✅ Note updated successfully');
    console.log('   New Title:', response.data.data.title);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testTogglePin() {
  console.log('\n📌 Testing: Toggle Pin');
  if (!createdNoteId) {
    console.log('⚠️  Skipped: No note ID available');
    return false;
  }

  try {
    const response = await api.post(`/notes/${createdNoteId}/pin`);
    console.log('✅ Pin toggled successfully');
    console.log('   Pinned:', response.data.data.is_pinned);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetTags() {
  console.log('\n🏷️  Testing: Get All Tags');
  try {
    const response = await api.get('/notes/tags/all');
    console.log('✅ Tags retrieved successfully');
    console.log('   Tags:', response.data.data.map(t => `${t.tag} (${t.count})`).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDeleteNote() {
  console.log('\n🗑️  Testing: Delete Note');
  if (!createdNoteId) {
    console.log('⚠️  Skipped: No note ID available');
    return false;
  }

  try {
    await api.delete(`/notes/${createdNoteId}`);
    console.log('✅ Note deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Notes API Tests');
  console.log('================================');

  if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('\n❌ Error: Please set a valid JWT token');
    console.log('   Set TEST_JWT_TOKEN environment variable or update the script');
    process.exit(1);
  }

  const results = [];

  results.push(await testCreateNote());
  results.push(await testListNotes());
  results.push(await testSearchNotes());
  results.push(await testFilterByTag());
  results.push(await testGetNote());
  results.push(await testUpdateNote());
  results.push(await testTogglePin());
  results.push(await testGetTags());
  results.push(await testDeleteNote());

  console.log('\n================================');
  console.log('📊 Test Results');
  console.log('================================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});
