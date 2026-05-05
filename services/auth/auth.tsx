import { LoginResponse } from "@/dto/auth/login";
import { HttpService } from "../http";


export class AuthService extends HttpService {

    async employeeLogin(email: string, password: string) {
        return this.post<LoginResponse>("/auth/employee/login", { email, password });
    }

    async logout() {
        return this.post("/auth/logout", {});
    }

    async logoutAll() {
        return this.post("/auth/logout-all", {});
    }

    async me() {
        return this.get("/auth/me");
    }

    async refresh() {
        await this.onUnauthorized();
    }
}