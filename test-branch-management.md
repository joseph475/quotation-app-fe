# Testing Branch Management Functionality

Follow these steps to test the branch management functionality:

## Step 1: Login with Test User

1. Open the application in your browser (http://localhost:8080 or the port your webpack dev server is running on)
2. You should be redirected to the login page
3. Use the following credentials:
   - Email: test@example.com
   - Password: test123
4. Click "Sign in"

## Step 2: Navigate to Branch Management

1. After logging in, you should see the dashboard
2. Click on the "Settings" option in the sidebar
3. Click on "Branches" in the dropdown menu

## Step 3: View Branches

1. You should see a list of branches that were created by the seeder
2. The list should include:
   - Main Branch
   - North Branch
   - South Branch

## Step 4: Add a New Branch

1. Click the "Add New Branch" button
2. Fill in the form with the following details:
   - Branch Name: East Branch
   - Address: 123 East Street, Pasig City, Metro Manila, Philippines
   - Contact Number: (02) 8111-2222
   - Branch Manager: Juan Santos
   - Email: east@example.com
   - Active Branch: Checked
3. Click "Create Branch"
4. The new branch should appear in the list

## Step 5: Edit a Branch

1. Click the "Edit" button next to any branch
2. Modify some details
3. Click "Update Branch"
4. The branch should be updated with the new details

## Step 6: Delete a Branch

1. Click the "Delete" button next to any branch
2. Confirm the deletion
3. The branch should be removed from the list

## Troubleshooting

If you encounter any issues:

1. Make sure both the backend and frontend servers are running
2. Check the browser console for any errors
3. Ensure you're logged in (you should see your user info in the header)
4. If you get authentication errors, try logging out and logging back in
