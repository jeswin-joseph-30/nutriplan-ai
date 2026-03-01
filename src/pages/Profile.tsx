import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

const COMMON_ALLERGIES = ["Dairy", "Eggs", "Peanuts", "Tree Nuts", "Wheat", "Soy", "Fish", "Shellfish", "Sesame"];

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    gender: "male",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    health_goal: "maintenance",
    dietary_preference: "non_vegetarian",
    allergies: [] as string[],
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name || "",
          age: data.age?.toString() || "",
          gender: data.gender || "male",
          height_cm: data.height_cm?.toString() || "",
          weight_kg: data.weight_kg?.toString() || "",
          activity_level: data.activity_level || "moderate",
          health_goal: data.health_goal || "maintenance",
          dietary_preference: data.dietary_preference || "non_vegetarian",
          allergies: data.allergies || [],
        });
      }
      setLoading(false);
    });
  }, [user]);

  const calculateCalories = () => {
    const weight = parseFloat(form.weight_kg) || 70;
    const height = parseFloat(form.height_cm) || 170;
    const age = parseInt(form.age) || 30;
    // Mifflin-St Jeor
    let bmr = form.gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
    const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    let tdee = bmr * (multipliers[form.activity_level] || 1.55);
    if (form.health_goal === "weight_loss") tdee -= 500;
    else if (form.health_goal === "weight_gain" || form.health_goal === "muscle_gain") tdee += 300;
    return Math.round(tdee);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const calorieTarget = calculateCalories();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      age: parseInt(form.age) || null,
      gender: form.gender,
      height_cm: parseFloat(form.height_cm) || null,
      weight_kg: parseFloat(form.weight_kg) || null,
      activity_level: form.activity_level,
      health_goal: form.health_goal,
      dietary_preference: form.dietary_preference,
      allergies: form.allergies,
      daily_calorie_target: calorieTarget,
    }).eq("user_id", user.id);

    if (error) toast.error("Failed to save profile");
    else toast.success(`Profile saved! Daily target: ${calorieTarget} cal`);
    setSaving(false);
  };

  const toggleAllergy = (allergy: string) => {
    setForm(f => ({
      ...f,
      allergies: f.allergies.includes(allergy)
        ? f.allergies.filter(a => a !== allergy)
        : [...f.allergies, allergy],
    }));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
        <p className="text-muted-foreground">Set your health details for personalized meal plans</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="25" />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input type="number" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="170" />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} placeholder="70" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Health & Diet</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select value={form.activity_level} onValueChange={v => setForm(f => ({ ...f, activity_level: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="light">Lightly Active</SelectItem>
                <SelectItem value="moderate">Moderately Active</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Health Goal</Label>
            <Select value={form.health_goal} onValueChange={v => setForm(f => ({ ...f, health_goal: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="weight_gain">Weight Gain</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dietary Preference</Label>
            <Select value={form.dietary_preference} onValueChange={v => setForm(f => ({ ...f, dietary_preference: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="non_vegetarian">Non-Vegetarian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Allergies</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map(a => (
                <Badge
                  key={a}
                  variant={form.allergies.includes(a) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggleAllergy(a)}
                >
                  {a}
                  {form.allergies.includes(a) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Profile
      </Button>
    </div>
  );
}
