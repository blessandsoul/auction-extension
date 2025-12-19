import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        // Hardcoded for local docker
        url: "mysql://root:root@localhost:3306/auction_auth_service",
    },
});
