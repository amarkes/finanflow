import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Wallet, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: ForgotPasswordForm) {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setEmailSent(true);
      toast.success('Email de recuperação enviado!');
    } catch (error) {
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Wallet className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>
            {emailSent
              ? 'Enviamos um email com instruções para redefinir sua senha'
              : 'Digite seu email para receber as instruções de recuperação'}
          </CardDescription>
        </CardHeader>
        {!emailSent ? (
          <>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Verifique sua caixa de entrada e siga as instruções no email para redefinir sua senha.
            </p>
          </CardContent>
        )}
        <CardFooter className="flex justify-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
