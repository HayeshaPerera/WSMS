import { Component } from '@angular/core'; // Import Component decorator from Angular core library, used to define UI components
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Import form handling utilities for building reactive forms
import { Router } from '@angular/router'; // Import Router service for navigating between different pages
import { AuthService } from '../../services/auth.service'; // Import our custom AuthService to handle login API calls

@Component({ // The Component decorator tells Angular this class is a UI component
  selector: 'app-login', // The custom HTML tag used to insert this component (<app-login>)
  templateUrl: './login.component.html', // The path to the HTML template file for this component
  styleUrls: ['./login.component.css'] // The path to the CSS styling file for this component
})
export class LoginComponent { // Export the class so it can be used in other parts of the Angular app
  loginForm: FormGroup; // Declare a variable to hold the reactive form structure
  loading = false; // Declare a boolean to track if the login API request is currently loading
  errorMessage = ''; // Declare a string to hold any error messages from a failed login (e.g. wrong password)
  showPassword = false; // Declare a boolean to toggle password visibility (text vs dots)

  constructor( // The constructor runs immediately when the component is created
    private fb: FormBuilder, // Inject FormBuilder to easily create complex forms
    private authService: AuthService, // Inject AuthService to talk to our backend
    private router: Router // Inject Router to redirect the user after login
  ) {
    // Redirect already-authenticated users
    if (this.authService.isLoggedIn()) { // Check if the user is already logged in (has a valid token in localStorage)
      this.authService.redirectToDashboard(); // If they are, send them straight to their dashboard (skip login)
    }
    this.loginForm = this.fb.group({ // Initialize the login form using the FormBuilder
      username: ['', [Validators.required, Validators.minLength(3)]], // Username field: starts empty, is required, min 3 chars
      password: ['', Validators.required] // Password field: starts empty, is required
    });
  }

  onSubmit(): void { // This method is called when the user clicks the submit button on the form
    if (this.loginForm.invalid) { // Check if the form is invalid (e.g. missing required fields)
      this.loginForm.markAllAsTouched(); // Mark all fields as touched to trigger the red error messages in the UI
      return; // Stop execution here, don't send anything to the server
    }
    this.loading = true; // Set loading to true to show 'Signing in...' text and disable the button
    this.errorMessage = ''; // Clear any previous error messages before trying again

    this.authService.login(this.loginForm.value).subscribe({ // Call the login service with form values (username & password), and subscribe to wait for the result
      next: () => { // If the login request is successful (HTTP 200 OK)
        this.loading = false; // Turn off the loading state
        this.authService.redirectToDashboard(); // Redirect the user to their role-specific dashboard page
      },
      error: () => { // If the login request fails (e.g. HTTP 401 Unauthorized because of wrong password)
        this.loading = false; // Turn off the loading state
        this.errorMessage = 'Invalid username or password. Please try again.'; // Set the error message to display in the UI alert box
      }
    });
  }

  get usernameInvalid(): boolean { // A getter method to easily check if the username field is invalid for the UI
    const c = this.loginForm.get('username'); // Get the username form control object
    return !!(c?.invalid && c?.touched); // Return true if it's invalid AND the user has clicked into it (touched)
  }

  get passwordInvalid(): boolean { // A getter method to easily check if the password field is invalid for the UI
    const c = this.loginForm.get('password'); // Get the password form control object
    return !!(c?.invalid && c?.touched); // Return true if it's invalid AND the user has clicked into it (touched)
  }
}
