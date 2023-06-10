import Image from "next/image";
import { Inter } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import useSWR from "swr";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: { data: todos } = {}, mutate } = useSWR(
    "todosList",
    async () =>
      await db.from("todos").select().order("id", { ascending: false })
  );

  // we want to use supabase realtime to listen for postgres changes
  // re: update, create, delete on the todos table and trigger mutate()
  useEffect(() => {
    db?.channel("any")
      .on("postgres_changes", { event: "*", schema: "*" }, (payload) => {
        mutate();
        console.log("Change received!", payload);
      })
      .subscribe();
  }, [db]);

  console.log(todos, db);

  return (
    <div className="p-12 py-8">
      <h1 className="text-5xl font-bold">Todos</h1>
      <dl>
        {todos?.map((todo) => (
          <div
            key={todo.id}
            className="mt-3 grid grid-flow-col auto-cols-max space-x-4"
          >
            {/* we want the dds to be arranged in a horizontal grid */}
            <dt>{new Date(todo.created_at).toLocaleDateString("en-US")}</dt>
            <dd className={todo.finished ? "line-through" : ""}>
              {/* we want to have the text struckout with tailwindjs when .finished==true */}

              {todo.body}
            </dd>
            <dd>
              {/* mark completed */}
              {!todo.finished ? (
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded-md ml-3"
                  onClick={async () => {
                    await db
                      .from("todos")
                      .update({ finished: true })
                      .eq("id", todo.id);
                    mutate();
                  }}
                >
                  Mark done
                </button>
              ) : (
                <button
                  className="bg-green-500 text-white px-3 py-1 rounded-md ml-3"
                  onClick={async () => {
                    await db
                      .from("todos")
                      .update({ finished: false })
                      .eq("id", todo.id);
                    mutate();
                  }}
                >
                  Mark not completed
                </button>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <h2 className="text-2xl font-bold mt-5">Add a todo</h2>
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const { value } = e.target.elements[0];
          await db.from("todos").insert({ body: value });
          e.target.reset();
          mutate();
        }}
      >
        <input type="text" placeholder="New todo" className="border" />
        <button className="bg-blue-500 text-white px-3 py-1 rounded-md ml-3">
          Add
        </button>
      </form>
    </div>
  );
}
