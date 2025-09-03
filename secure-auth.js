class SecureAuth {
    constructor() {
        this.validCredentials = {
            username: 'admin',
            passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
        };
        
        this.loginAttempts = 0;
        this.lastLoginAttempt = 0;
        this.blockedUntil = 0;
        this.maxAttempts = 5;
        this.blockDuration = 15 * 60 * 1000;
        this.resetTime = 60 * 60 * 1000;
    }
    
    isBlocked() {
        if (this.blockedUntil > Date.now()) {
            return true;
        }
        
        if (Date.now() - this.lastLoginAttempt > this.resetTime) {
            this.loginAttempts = 0;
            this.blockedUntil = 0;
        }
        
        return false;
    }
    
    handleFailedLogin() {
        this.loginAttempts++;
        this.lastLoginAttempt = Date.now();
        
        if (this.loginAttempts >= this.maxAttempts) {
            this.blockedUntil = Date.now() + this.blockDuration;
        }
    }
    
    getRemainingBlockTime() {
        if (!this.isBlocked()) return 0;
        return Math.ceil((this.blockedUntil - Date.now()) / 1000);
    }
    
    async hashPassword(password) {
        const salt = "crm_salt_2024";
        const str = password + salt;
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex;
        } catch (error) {
            return this.simpleHash(str);
        }
    }
    
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(16);
    }
    
    async validateCredentials(username, password) {
        if (this.isBlocked()) {
            const remainingTime = this.getRemainingBlockTime();
            throw new Error(`Слишком много попыток входа. Попробуйте через ${remainingTime} секунд`);
        }
        
        try {
            const passwordHash = await this.hashPassword(password);
            
            const isValid = username === this.validCredentials.username && 
                           passwordHash === this.validCredentials.passwordHash;
            
            if (isValid) {
                this.loginAttempts = 0;
                this.blockedUntil = 0;
                return true;
            } else {
                this.handleFailedLogin();
                return false;
            }
        } catch (error) {
            this.handleFailedLogin();
            return false;
        }
    }
    
    getLoginInfo() {
        return {
            attempts: this.loginAttempts,
            maxAttempts: this.maxAttempts,
            isBlocked: this.isBlocked(),
            remainingBlockTime: this.getRemainingBlockTime(),
            lastAttempt: this.lastLoginAttempt
        };
    }
    
    resetAttempts() {
        this.loginAttempts = 0;
        this.blockedUntil = 0;
        this.lastLoginAttempt = 0;
    }
}

window.SecureAuth = SecureAuth;
