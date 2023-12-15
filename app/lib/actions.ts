'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(), // coerce 尝试转换为目标类型 此处为 number
  status: z.enum(['pending', 'paid']),
  date: z.string()
})

// 去除 id 和 date 字段 构建新类型
const CreateInvoice = FormSchema.omit({id: true, date: true})

export async function createInvoice(formData: FormData) {

  // 如果表单包含比较多的字段时 可以用下面代码自动转换
  // const rawFormData = Object.fromEntries(formData.entries());
  // console.log(formData.entries(), Object.fromEntries(formData.entries()))
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  // 以美分为单位存储金额 防止javascript中的浮点数精度问题 使更加准确
  const amountInCents = amount * 100;
  // 为发票创建日期创建一个格式为 "YYYY-MM-DD "的新日期
  const date = new Date().toISOString().split('T')[0];
  await sql `
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  // 清空原先的缓存
  revalidatePath('/dashboard/invoices');
  // 重定向到发票页面
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id:string, formData: FormData) {
  const { customerId, amount, status } = FormSchema.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  const amountInCents = amount * 100;
  await sql `
    UPDATE invoices 
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql `
    DELETE FROM invoices WHERE id=${id}
  `
  revalidatePath('/dashboard/invoices');
}
