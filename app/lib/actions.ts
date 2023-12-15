'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.'
  }),
  amount: z.coerce.number().gt(0, {message: 'Please enter an amount greater than $0.'}), // coerce 尝试转换为目标类型 此处为 number
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.'
  }),
  date: z.string()
})

// 去除 id 和 date 字段 构建新类型
const CreateInvoice = FormSchema.omit({id: true, date: true})

const UpdateInvoice = FormSchema.omit({id: true, date: true})

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
}

export async function createInvoice(prevState:State,formData: FormData) {
  // 如果表单包含比较多的字段时 可以用下面代码自动转换
  // const rawFormData = Object.fromEntries(formData.entries());
  // console.log(formData.entries(), Object.fromEntries(formData.entries()))
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  

  if (!validatedFields.success) {
    // console.log(validatedFields.error.flatten().fieldErrors)
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    }
  }

  const {customerId, amount, status} = validatedFields.data

  // 以美分为单位存储金额 防止javascript中的浮点数精度问题 使更加准确
  const amountInCents = amount * 100;
  // 为发票创建日期创建一个格式为 "YYYY-MM-DD "的新日期
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  }catch(e) {
    return {
      message: 'Database Error: Failed to Create Invoice.'
    }
  }
  // 清空原先的缓存
  revalidatePath('/dashboard/invoices');
  // 请注意如何在 try/catch 块之外调用重定向。这是因为重定向通过抛出错误来工作，该错误将被 catch 块捕获。为避免这种情况，您可以在 try/catch 之后调用重定向。只有当尝试成功时，才能访问重定向。
  // 重定向到发票页面
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id:string,prevState:State, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    }
  }
  const {customerId, amount, status} = validatedFields.data;
  const amountInCents = amount * 100;
  try{
    await sql `
      UPDATE invoices 
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `
  }catch(e) {
    return {
      message: 'Database Error: Failed to Update Invoice.'
    }
  }
  
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    await sql `
      DELETE FROM invoices WHERE id=${id}
    `
    revalidatePath('/dashboard/invoices');
    return {
      message: 'Invoice Deleted.'
    }
  }catch(e) {
    return {
      message: 'Database Error: Failed to Delete Invoice.'
    }
  }
}

export async function authorize(prevState: string|undefined, formData:FormData) {
  try {
    await signIn('credentials', formData)
  } catch(error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid Credentials';
        default:
          return 'Something went wrong'
      }
    }
    throw error;
  }
}
