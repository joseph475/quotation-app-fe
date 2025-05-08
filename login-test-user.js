// This script helps you log in with the test user
// Run this in your browser console after opening the login page

// Set the email and password fields
document.getElementById('email').value = 'test@example.com';
document.getElementById('password').value = 'test123';

// Submit the form
document.querySelector('form').dispatchEvent(new Event('submit'));
