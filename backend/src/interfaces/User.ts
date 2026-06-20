export interface User {
    id: number;
    nome: string;
    username: string;
    password_hash?: string;
    created_at: Date;
}
