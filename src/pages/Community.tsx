import { useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useCommunityChangelog,
  useCreateCommunityFeedback,
  useMyCommunityFeedback,
  useAllCommunityFeedback,
  useUpdateCommunityFeedback,
  CommunityFeedback,
  CommunityFeedbackStatus,
  CommunityFeedbackType,
} from "@/hooks/useCommunityFeedback";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/currency";
import { Loader2, Megaphone, Bug, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

const feedbackSchema = z.object({
  type: z.enum(["suggestion", "issue"], {
    required_error: "Selecione o tipo de contribuição",
  }),
  title: z
    .string()
    .min(3, "Informe um título com pelo menos 3 caracteres")
    .max(120, "O título pode ter no máximo 120 caracteres"),
  description: z
    .string()
    .min(10, "Descreva sua ideia ou problema com pelo menos 10 caracteres")
    .max(2000, "A descrição pode ter no máximo 2000 caracteres"),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const feedbackTypeOptions: Array<{
  value: FeedbackFormValues["type"];
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "suggestion",
    label: "Dica ou melhoria",
    description: "Compartilhe ideias que tornem a plataforma melhor para todos.",
    icon: <Sparkles className="h-4 w-4 text-primary" />,
  },
  {
    value: "issue",
    label: "Problema ou bug",
    description: "Reporte falhas ou comportamentos inesperados que encontrou.",
    icon: <Bug className="h-4 w-4 text-destructive" />,
  },
];

const statusMap: Record<
  CommunityFeedback["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pendente", variant: "outline" },
  reviewing: { label: "Em análise", variant: "secondary" },
  done: { label: "Implementado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

const typeLabelMap: Record<FeedbackFormValues["type"], string> = {
  suggestion: "Dica/Sugestão",
  issue: "Problema/Bug",
};

const statusFilterOptions: Array<{ value: CommunityFeedbackStatus | "all"; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "reviewing", label: "Em análise" },
  { value: "done", label: "Implementado" },
  { value: "rejected", label: "Rejeitado" },
];

const typeFilterOptions: Array<{ value: CommunityFeedbackType | "all"; label: string }> = [
  { value: "all", label: "Todos os tipos" },
  { value: "suggestion", label: "Dicas" },
  { value: "issue", label: "Problemas" },
];

export default function Community() {
  const { data: profile } = useProfile();
  const isStaff = profile?.is_staff ?? false;

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "suggestion",
      title: "",
      description: "",
    },
  });

  const createFeedback = useCreateCommunityFeedback();
  const {
    data: changelog,
    isLoading: isLoadingChangelog,
    isFetching: isFetchingChangelog,
  } = useCommunityChangelog();
  const {
    data: myFeedback,
    isLoading: isLoadingMyFeedback,
    isFetching: isFetchingMyFeedback,
  } = useMyCommunityFeedback();

  const [adminFilters, setAdminFilters] = useState<{
    status: CommunityFeedbackStatus | "all";
    type: CommunityFeedbackType | "all";
  }>({ status: "all", type: "all" });

  const {
    data: allFeedback,
    isLoading: isLoadingAllFeedback,
    isFetching: isFetchingAllFeedback,
  } = useAllCommunityFeedback(adminFilters, isStaff);

  const updateFeedback = useUpdateCommunityFeedback();
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, CommunityFeedbackStatus>>({});

  const isSubmitting = createFeedback.isPending;
  const showChangelogSpinner = isLoadingChangelog || isFetchingChangelog;
  const showMyFeedbackSpinner = isLoadingMyFeedback || isFetchingMyFeedback;
  const showAdminSpinner = isLoadingAllFeedback || isFetchingAllFeedback;

  const feedbackSummary = useMemo(() => {
    if (!changelog || changelog.length === 0) {
      return { total: 0, issues: 0, suggestions: 0 };
    }
    return changelog.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.type === "issue") {
          acc.issues += 1;
        } else {
          acc.suggestions += 1;
        }
        return acc;
      },
      { total: 0, issues: 0, suggestions: 0 },
    );
  }, [changelog]);

  const handleSubmit = (values: FeedbackFormValues) => {
    createFeedback.mutate(values, {
      onSuccess: () => {
        form.reset({
          type: values.type,
          title: "",
          description: "",
        });
      },
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Comunidade</h1>
          <p className="text-muted-foreground">
            Envie sugestões, reporte problemas e acompanhe o que já foi
            implementado.
          </p>
        </div>

        <Tabs defaultValue="contribute">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="contribute">Enviar contribuição</TabsTrigger>
            <TabsTrigger value="changelog">Changelog público</TabsTrigger>
            {isStaff && (
              <TabsTrigger value="moderation" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Moderação
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="contribute">
            <Card>
              <CardHeader>
                <CardTitle>Nova contribuição</CardTitle>
                <CardDescription>
                  Compartilhe uma ideia ou relate um problema. Analisaremos e
                  priorizaremos conforme o impacto para a comunidade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    className="space-y-6"
                    onSubmit={form.handleSubmit(handleSubmit)}
                  >
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>O que você quer enviar?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              className="grid gap-3 sm:grid-cols-2"
                              onValueChange={(value) =>
                                field.onChange(value as FeedbackFormValues["type"])
                              }
                              value={field.value}
                            >
                              {feedbackTypeOptions.map((option) => {
                                const isSelected = field.value === option.value;
                                const optionId = `feedback-type-${option.value}`;
                                return (
                                  <label
                                    key={option.value}
                                    htmlFor={optionId}
                                    className={cn(
                                      "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-muted",
                                    )}
                                  >
                                    <RadioGroupItem
                                      id={optionId}
                                      value={option.value}
                                      className="mt-1"
                                    />
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        <span className="font-medium">
                                          {option.label}
                                        </span>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {option.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Adicionar gráficos comparativos"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Prioridade automática
                        </p>
                        <p className="mt-1">
                          Priorizar problemas ajuda a manter o sistema estável.
                          Sugestões ficam na fila para avaliação e planejamento.
                        </p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva com detalhes sua ideia ou o problema encontrado."
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Enviando você concorda em compartilhar sua sugestão com a
                        equipe. Obrigado por construir com a gente! 💙
                      </p>
                      <Button disabled={isSubmitting} type="submit">
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Enviar contribuição
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="space-y-2 py-6 text-center">
                  <p className="text-lg font-semibold">
                    Ajude a melhorar nossa plataforma!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Envie suas ideias ou relate problemas — juntos, deixamos o sistema
                    ainda melhor.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suas contribuições</CardTitle>
                  <CardDescription>
                    Acompanhe o status do que você já enviou para a equipe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showMyFeedbackSpinner && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando suas contribuições...
                    </div>
                  )}

                  {!showMyFeedbackSpinner && (!myFeedback || myFeedback.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Você ainda não enviou contribuições. Compartilhe uma ideia ou reporte um problema!
                    </p>
                  )}

                  {!showMyFeedbackSpinner && myFeedback && myFeedback.length > 0 && (
                    <div className="space-y-3">
                      {myFeedback.map((item) => {
                        const status = statusMap[item.status];
                        return (
                          <div key={item.id} className="rounded-lg border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={item.type === "issue" ? "destructive" : "secondary"}>
                                  {typeLabelMap[item.type]}
                                </Badge>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Enviado em {formatDate(item.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 font-medium text-foreground">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                            {item.staff_response && (
                              <div className="mt-3 rounded-md bg-primary/5 p-3 text-sm">
                                <p className="font-medium text-primary">Resposta da equipe</p>
                                <p className="text-primary">{item.staff_response}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="changelog">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Megaphone className="h-4 w-4 text-primary" />
                      Total de melhorias implementadas
                    </CardTitle>
                    <CardDescription>
                      Sugestões e problemas já entregues para a comunidade.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{feedbackSummary.total}</p>
                    <p className="text-xs text-muted-foreground">
                      {feedbackSummary.suggestions} dicas • {feedbackSummary.issues}{" "}
                      problemas
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Changelog público</CardTitle>
                  <CardDescription>
                    Atualizações aprovadas e disponibilizadas para todos os
                    usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showChangelogSpinner && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando changelog...
                    </div>
                  )}

                  {!showChangelogSpinner && (!changelog || changelog.length === 0) && (
                    <div className="space-y-3 text-center text-muted-foreground">
                      <p className="font-medium">Ainda não há contribuições publicadas.</p>
                      <p className="text-sm">
                        Envie uma ideia ou acompanhe o dashboard — assim que algo for
                        implementado, você verá por aqui.
                      </p>
                    </div>
                  )}

                  {!showChangelogSpinner && changelog && changelog.length > 0 && (
                    <div className="space-y-4">
                      {changelog.map((item) => {
                        const status = statusMap[item.status];
                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border p-4 shadow-sm transition hover:shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={item.type === "issue" ? "destructive" : "secondary"}>
                                  {typeLabelMap[item.type]}
                                </Badge>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.updated_at ?? item.created_at)}
                              </span>
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-foreground">
                              {item.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isStaff && (
            <TabsContent value="moderation">
              <Card>
                <CardHeader>
                  <CardTitle>Moderação de contribuições</CardTitle>
                  <CardDescription>
                    Ajuste status, registre respostas oficiais e mantenha o changelog sempre atualizado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={adminFilters.status}
                      onValueChange={(value: CommunityFeedbackStatus | "all") =>
                        setAdminFilters((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusFilterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={adminFilters.type}
                      onValueChange={(value: CommunityFeedbackType | "all") =>
                        setAdminFilters((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeFilterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showAdminSpinner && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando contribuições para moderação...
                    </div>
                  )}

                  {!showAdminSpinner && (!allFeedback || allFeedback.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center">
                      Nenhuma contribuição encontrada com os filtros selecionados.
                    </p>
                  )}

                  {!showAdminSpinner && allFeedback && allFeedback.length > 0 && (
                    <div className="space-y-4">
                      {allFeedback.map((item) => {
                        const status = statusMap[item.status];
                        const currentStatus = statusDrafts[item.id] ?? item.status;
                        const currentResponse = responseDrafts[item.id] ?? item.staff_response ?? "";

                        return (
                          <div key={item.id} className="rounded-lg border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={item.type === "issue" ? "destructive" : "secondary"}>
                                  {typeLabelMap[item.type]}
                                </Badge>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>ID usuário: {item.user_id}</p>
                                <p>Enviado em {formatDate(item.created_at)}</p>
                              </div>
                            </div>

                            <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>

                            <div className="mt-4 grid gap-3 lg:grid-cols-[200px,1fr]">
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                                  Status
                                </p>
                                <Select
                                  value={currentStatus}
                                  onValueChange={(value: CommunityFeedbackStatus) =>
                                    setStatusDrafts((prev) => ({ ...prev, [item.id]: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusFilterOptions
                                      .filter((option) => option.value !== "all")
                                      .map((option) => (
                                        <SelectItem key={option.value} value={option.value as CommunityFeedbackStatus}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                                  Resposta da equipe
                                </p>
                                <Textarea
                                  rows={4}
                                  value={currentResponse}
                                  onChange={(event) =>
                                    setResponseDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Compartilhe contexto ou próximos passos para a comunidade."
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusDrafts((prev) => {
                                    const { [item.id]: _removed, ...rest } = prev;
                                    return rest;
                                  });
                                  setResponseDrafts((prev) => {
                                    const { [item.id]: _removed, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                disabled={updateFeedback.isPending}
                              >
                                Descartar alterações
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const statusToSave = statusDrafts[item.id] ?? item.status;
                                  const responseToSave =
                                    responseDrafts[item.id] ?? item.staff_response ?? null;
                                  updateFeedback.mutate(
                                    {
                                      id: item.id,
                                      status: statusToSave,
                                      staff_response: responseToSave,
                                    },
                                    {
                                      onSuccess: () => {
                                        setStatusDrafts((prev) => {
                                          const { [item.id]: _removed, ...rest } = prev;
                                          return rest;
                                        });
                                        setResponseDrafts((prev) => {
                                          const { [item.id]: _removed, ...rest } = prev;
                                          return rest;
                                        });
                                      },
                                    }
                                  );
                                }}
                                disabled={updateFeedback.isPending}
                              >
                                {updateFeedback.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  "Salvar alterações"
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
