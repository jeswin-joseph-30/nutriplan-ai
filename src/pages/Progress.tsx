import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

export default function Progress() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Tables<"progress">[]>([]);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: true })
      .limit(30);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const addEntry = async () => {
    if (!user || !weight) return;
    setAdding(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("progress").insert({
      user_id: user.id,
      log_date: today,
      weight_kg: parseFloat(weight),
      notes: notes || null,
    });
    if (error) toast.error("Failed to log weight");
    else { toast.success("Weight logged!"); setWeight(""); setNotes(""); fetchEntries(); }
    setAdding(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const chartData = entries.map(e => ({
    date: new Date(e.log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: Number(e.weight_kg),
  }));

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const diff = latest && prev ? Number(latest.weight_kg) - Number(prev.weight_kg) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground">Track your weight over time</p>
      </div>

      {/* Log weight */}
      <Card className="shadow-card">
        <CardHeader><CardTitle>Log Today's Weight</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70.5" />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Feeling good" />
            </div>
          </div>
          <Button onClick={addEntry} disabled={adding || !weight} className="gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log Weight
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Weight</p>
              <p className="text-2xl font-bold text-foreground">{Number(latest.weight_kg).toFixed(1)} kg</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Change</p>
              <div className="flex items-center justify-center gap-1">
                {diff < 0 ? <TrendingDown className="h-5 w-5 text-success" /> : diff > 0 ? <TrendingUp className="h-5 w-5 text-accent" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
                <p className="text-2xl font-bold text-foreground">{diff > 0 ? "+" : ""}{diff.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle>Weight Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {entries.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...entries].reverse().slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                  <span className="text-sm text-foreground">{new Date(e.log_date).toLocaleDateString()}</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground">{Number(e.weight_kg).toFixed(1)} kg</span>
                    {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
