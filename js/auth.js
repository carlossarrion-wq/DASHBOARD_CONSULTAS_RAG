// Authentication Module for RAG Query Monitoring Dashboard
// Handles AWS credential validation, session management, and logout

(function() {
    'use strict';

    // Session storage keys
    const STORAGE_KEYS = {
        ACCESS_KEY: 'aws_access_key',
        SECRET_KEY: 'aws_secret_key',
        SESSION_TOKEN: 'aws_session_token',
        SESSION_VALIDATED: 'aws_session_validated',
        USER_ARN: 'aws_user_arn',
        LOGIN_TIME: 'aws_login_time',
        EXPIRATION_TIME: 'aws_expiration_time'
    };

    /**
     * Check if user is authenticated
     * @returns {boolean} True if valid session exists
     */
    function isAuthenticated() {
        const accessKey = sessionStorage.getItem(STORAGE_KEYS.ACCESS_KEY);
        const secretKey = sessionStorage.getItem(STORAGE_KEYS.SECRET_KEY);
        const validated = sessionStorage.getItem(STORAGE_KEYS.SESSION_VALIDATED);
        const loginTime = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);

        // Check if credentials exist
        if (!accessKey || !secretKey || validated !== 'true') {
            return false;
        }

        // Check session timeout
        if (loginTime) {
            const sessionTimeout = (window.AWS_CONFIG?.session_timeout || 60) * 60 * 1000; // Convert to ms
            const elapsed = Date.now() - parseInt(loginTime);
            
            if (elapsed > sessionTimeout) {
                console.warn('Session expired due to timeout');
                clearSession();
                return false;
            }
        }

        // Check expiration time if using temporary credentials
        const expirationTime = sessionStorage.getItem(STORAGE_KEYS.EXPIRATION_TIME);
        if (expirationTime) {
            const expiration = new Date(expirationTime);
            if (Date.now() >= expiration.getTime()) {
                console.warn('Temporary credentials expired');
                clearSession();
                return false;
            }
        }

        return true;
    }

    /**
     * Require authentication - redirect to login if not authenticated
     * @param {string} loginUrl - URL to redirect to if not authenticated
     */
    function requireAuth(loginUrl = 'login.html') {
        if (!isAuthenticated()) {
            console.warn('Authentication required - redirecting to login');
            window.location.href = loginUrl + '?error=no_credentials';
        }
    }

    /**
     * Configure AWS SDK with stored credentials
     * @returns {boolean} True if AWS SDK was configured successfully
     */
    function configureAWS() {
        if (!isAuthenticated()) {
            console.error('Cannot configure AWS - no valid session');
            return false;
        }

        const accessKey = sessionStorage.getItem(STORAGE_KEYS.ACCESS_KEY);
        const secretKey = sessionStorage.getItem(STORAGE_KEYS.SECRET_KEY);
        const sessionToken = sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
        const region = window.AWS_CONFIG?.region || 'eu-west-1';

        try {
            const credentials = {
                accessKeyId: accessKey,
                secretAccessKey: secretKey
            };

            // Add session token if using temporary credentials
            if (sessionToken) {
                credentials.sessionToken = sessionToken;
            }

            AWS.config.update({
                region: region,
                credentials: new AWS.Credentials(credentials)
            });

            console.log('✅ AWS SDK configured successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to configure AWS SDK:', error);
            return false;
        }
    }

    /**
     * Get current user information
     * @returns {Object} User information from session
     */
    function getCurrentUser() {
        if (!isAuthenticated()) {
            return null;
        }

        return {
            arn: sessionStorage.getItem(STORAGE_KEYS.USER_ARN),
            accessKey: sessionStorage.getItem(STORAGE_KEYS.ACCESS_KEY),
            loginTime: sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME),
            expirationTime: sessionStorage.getItem(STORAGE_KEYS.EXPIRATION_TIME)
        };
    }

    /**
     * Store authentication credentials
     * @param {Object} credentials - Credentials object
     */
    function storeCredentials(credentials) {
        sessionStorage.setItem(STORAGE_KEYS.ACCESS_KEY, credentials.accessKey);
        sessionStorage.setItem(STORAGE_KEYS.SECRET_KEY, credentials.secretKey);
        sessionStorage.setItem(STORAGE_KEYS.SESSION_VALIDATED, 'true');
        sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIME, Date.now().toString());

        if (credentials.sessionToken) {
            sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, credentials.sessionToken);
        }

        if (credentials.userArn) {
            sessionStorage.setItem(STORAGE_KEYS.USER_ARN, credentials.userArn);
        }

        if (credentials.expiration) {
            sessionStorage.setItem(STORAGE_KEYS.EXPIRATION_TIME, credentials.expiration);
        }

        console.log('✅ Credentials stored in session');
    }

    /**
     * Clear session and logout
     */
    function clearSession() {
        // Clear all session storage items
        Object.values(STORAGE_KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });

        console.log('🔒 Session cleared');
    }

    /**
     * Logout user and redirect to login
     * @param {string} loginUrl - URL to redirect to after logout
     */
    function logout(loginUrl = 'login.html') {
        clearSession();
        window.location.href = loginUrl;
    }

    /**
     * Get time remaining in session (in minutes)
     * @returns {number} Minutes remaining, or null if no session
     */
    function getSessionTimeRemaining() {
        if (!isAuthenticated()) {
            return null;
        }

        const loginTime = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
        const expirationTime = sessionStorage.getItem(STORAGE_KEYS.EXPIRATION_TIME);

        if (expirationTime) {
            // Using temporary credentials with explicit expiration
            const expiration = new Date(expirationTime);
            const remaining = expiration.getTime() - Date.now();
            return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
        } else if (loginTime) {
            // Using session timeout
            const sessionTimeout = (window.AWS_CONFIG?.session_timeout || 60) * 60 * 1000;
            const elapsed = Date.now() - parseInt(loginTime);
            const remaining = sessionTimeout - elapsed;
            return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
        }

        return null;
    }

    /**
     * Validate AWS credentials with STS
     * @param {string} accessKey - AWS Access Key ID
     * @param {string} secretKey - AWS Secret Access Key
     * @returns {Promise<Object>} Caller identity information
     */
    async function validateCredentials(accessKey, secretKey) {
        const region = window.AWS_CONFIG?.region || 'eu-west-1';

        AWS.config.update({
            region: region,
            credentials: new AWS.Credentials({
                accessKeyId: accessKey,
                secretAccessKey: secretKey
            })
        });

        const sts = new AWS.STS();
        
        try {
            const identity = await sts.getCallerIdentity().promise();
            console.log('✅ Credentials validated:', identity);
            return identity;
        } catch (error) {
            console.error('❌ Invalid credentials:', error);
            throw new Error('Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.');
        }
    }

    /**
     * Attempt to assume a role (optional)
     * @param {string} roleArn - ARN of the role to assume
     * @param {string} externalId - External ID for the role (optional)
     * @returns {Promise<Object>} Assumed role credentials
     */
    async function assumeRole(roleArn, externalId = null) {
        const sts = new AWS.STS();
        
        const params = {
            RoleArn: roleArn,
            RoleSessionName: 'rag-dashboard-session',
            DurationSeconds: 3600 // 1 hour
        };

        if (externalId) {
            params.ExternalId = externalId;
        }

        try {
            const result = await sts.assumeRole(params).promise();
            console.log('✅ Successfully assumed role');
            return result;
        } catch (error) {
            console.error('❌ Failed to assume role:', error);
            throw new Error(`Unable to assume role: ${error.message}`);
        }
    }

    // Export auth module to window
    window.authModule = {
        isAuthenticated,
        requireAuth,
        configureAWS,
        getCurrentUser,
        storeCredentials,
        clearSession,
        logout,
        getSessionTimeRemaining,
        validateCredentials,
        assumeRole
    };

    console.log('✅ Auth module loaded');

})();
