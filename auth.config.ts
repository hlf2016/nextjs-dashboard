import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  // 可以使用 pages 选项指定自定义登录、登出和出错页面的路径。这不是必需的，但通过在页面选项中添加登录："/login"，用户将被重定向到我们的自定义登录页面，而不是 NextAuth.js 的默认页面。
  pages: {
    signIn: '/login'
  },
  callbacks: {
    authorized({ auth, request:{ nextUrl }}) {
      // !! 是一个逻辑运算符，它会将其后面的值转换为布尔值。如果 auth.user 存在（即用户已登录），那么 !!auth.user 的结果就是 true。如果 auth.user 不存在（即用户未登录），那么结果就是 false。
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // 将未经身份验证的用户重定向到登录页面
      } else if (isLoggedIn) {
        // 第一个参数是 path  第二个参数是 base
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig

